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
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from invitations.auth_views import register, login, refresh, logout

def health_check(_request):
    return JsonResponse({"status": "ok", "service": "you_are_invited_api lrst"})

urlpatterns = [
    path('', health_check),
    path('admin/', admin.site.urls),
    path('api/', include('invitations.urls')),
    path('api/auth/register/', register),
    path('api/auth/login/', login),
    path('api/auth/refresh/', refresh),
    path('api/auth/logout/', logout),
]
