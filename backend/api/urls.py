"""api URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.contrib import admin
from django.urls import path, include, re_path
from django.http import JsonResponse
from django.views.static import serve
from invitations.auth_views import (
    register,
    login,
    logout,
    me,
    account_settings,
    export_account_data,
    delete_account,
    verify_email,
    resend_verification,
    google_auth,
)
from rest_framework_simplejwt.views import TokenRefreshView
from invitations.superadmin_views import (
    superadmin_stats,
    superadmin_growth,
    superadmin_users,
    superadmin_user_detail,
    superadmin_user_events,
    superadmin_event_detail,
)

def health_check(_request):
    return JsonResponse({"status": "ok", "service": "you_are_invited_api lrst"})

urlpatterns = [
    path('', health_check),
    path('admin/', admin.site.urls),
    path('api/', include('invitations.urls')),
    path('api/auth/register/', register),
    path('api/auth/login/', login),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/logout/', logout),
    path('api/auth/me/', me),
    path('api/auth/settings/', account_settings),
    path('api/auth/export/', export_account_data),
    path('api/auth/delete/', delete_account),
    path('api/auth/verify-email/', verify_email),
    path('api/auth/resend-verification/', resend_verification),
    path('api/auth/google/', google_auth),
    path('api/superadmin/stats/', superadmin_stats),
    path('api/superadmin/growth/', superadmin_growth),
    path('api/superadmin/users/', superadmin_users),
    path('api/superadmin/users/<int:user_id>/', superadmin_user_detail),
    path('api/superadmin/users/<int:user_id>/events/', superadmin_user_events),
    path('api/superadmin/events/<uuid:event_id>/', superadmin_event_detail),
]

if not settings.USE_S3_STORAGE and not settings.IS_VERCEL:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    ]
