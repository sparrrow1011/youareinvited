from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvitationViewSet, EventViewSet

router = DefaultRouter()
router.register(r'invitations', InvitationViewSet, basename='invitation')
router.register(r'events', EventViewSet, basename='event')

urlpatterns = [
    path('', include(router.urls)),
]
