"""
URL configuration for google_email_service project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
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
from django.shortcuts import redirect
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView
)

def api_root(request):
    """Root API endpoint that provides information about available endpoints"""
    return JsonResponse({
        "message": "Welcome to Google Email Service API",
        "version": "1.0.0",
        "endpoints": {
            "admin": "/admin/",
            "api_documentation": "/api/docs/",
            "api_schema": "/api/schema/",
            "redoc_documentation": "/api/redoc/",
            "gmail_api": "/api/gmail/",
            "vendors_api": "/api/vendors/",
            "chat_api": "/api/chat/",
        },
        "documentation": {
            "swagger_ui": "/docs/",
            "redoc": "/redoc/",
            "api_schema": "/api/schema/"
        }
    })

def redirect_to_docs(request):
    """Redirect /docs/ to /api/docs/"""
    return redirect('/api/docs/')

def redirect_to_redoc(request):
    """Redirect /redoc/ to /api/redoc/"""
    return redirect('/api/redoc/')

urlpatterns = [
    # Root API endpoint
    path('', api_root, name='api-root'),
    path('api/', api_root, name='api-root-explicit'),
    
    # Admin
    path('admin/', admin.site.urls),

    # API endpoints
    path('api/gmail/', include('gmail_service.urls')),
    path("api/vendors/", include("vendors.urls")),
    path("api/chat/", include("chat.urls")),

    # API Documentation - main endpoints
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # Convenience redirects for documentation
    path('docs/', redirect_to_docs, name='docs-redirect'),
    path('redoc/', redirect_to_redoc, name='redoc-redirect'),
    path('swagger/', redirect_to_docs, name='swagger-redirect'),
]
