from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.utils import timezone
from django.db.utils import OperationalError, ProgrammingError
from .models import Invitation
from .permissions import IsAuthenticatedOrGuestDetail
from .serializers import (
    InvitationSerializer,
    InvitationCreateSerializer,
    CheckInSerializer
)


class InvitationViewSet(viewsets.ModelViewSet):
    queryset = Invitation.objects.all()
    serializer_class = InvitationSerializer

    def get_permissions(self):
        if self.action in ('retrieve', 'check_in'):
            # Guests can view their invitation and check themselves in
            return []
        if self.action in ('admin_undo_check_in', 'regenerate_images'):
            # Only Django admin/staff users
            return [IsAdminUser()]
        # Everything else (list, create, update, destroy, stats) requires auth
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return InvitationCreateSerializer
        return InvitationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invitation = serializer.save()
        response_serializer = InvitationSerializer(invitation)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        """
        Check in a guest. Once checked in, cannot be undone by the guest.
        Only admin can undo via the admin panel.
        """
        invitation = self.get_object()

        if invitation.checked_in:
            return Response(
                {'detail': 'Already checked in'},
                status=status.HTTP_400_BAD_REQUEST
            )

        invitation.checked_in = True
        invitation.checked_in_at = timezone.now()
        invitation.save()

        serializer = InvitationSerializer(invitation)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def admin_undo_check_in(self, request, pk=None):
        """
        Admin-only endpoint to undo a guest check-in.
        Requires Django staff/superuser status.
        """
        invitation = self.get_object()

        invitation.checked_in = False
        invitation.checked_in_at = None
        invitation.save()

        serializer = InvitationSerializer(invitation)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def regenerate_images(self, request, pk=None):
        """
        Admin-only endpoint to regenerate QR code and e-invite image.
        Requires Django staff/superuser status.
        """
        invitation = self.get_object()

        invitation.generate_qr_code()
        invitation.generate_e_invite()
        invitation.save()

        serializer = InvitationSerializer(invitation)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get invitation statistics.
        """
        try:
            total = Invitation.objects.count()
            checked_in = Invitation.objects.filter(checked_in=True).count()
        except (OperationalError, ProgrammingError):
            return Response({
                'total_invitations': 0,
                'checked_in': 0,
                'pending': 0,
                'check_in_rate': 0,
                'warning': 'Database is not initialized. Run migrations or configure DATABASE_URL.'
            }, status=status.HTTP_200_OK)

        pending = total - checked_in

        return Response({
            'total_invitations': total,
            'checked_in': checked_in,
            'pending': pending,
            'check_in_rate': (checked_in / total * 100) if total > 0 else 0
        })
