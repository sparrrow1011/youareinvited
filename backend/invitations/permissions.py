from rest_framework.permissions import BasePermission, IsAdminUser, SAFE_METHODS


class IsAuthenticatedOrGuestDetail(BasePermission):
    """
    Allow unauthenticated access to safe methods on detail routes (retrieve, check_in).
    All other actions require authentication.
    """
    def has_permission(self, request, view):
        # Detail-level GET (retrieve) and check_in are open to guests
        if view.action in ('retrieve', 'check_in'):
            return True
        return bool(request.user and request.user.is_authenticated)
