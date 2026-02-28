import jwt
import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.middleware import AuthenticationMiddleware
from django.http import HttpResponseRedirect
from django.urls import reverse
from urllib.parse import quote


AVADMIN_API_URL = getattr(settings, 'AVADMIN_API_URL', 'https://avadmin.avelarcompany.com.br')
APP_PORTAL_URL = getattr(settings, 'APP_PORTAL_URL', 'https://app.avelarcompany.com.br')
JWT_SECRET = getattr(settings, 'JWT_SECRET', '7e8b3e0b9569e981108237b28f79e689484de500f9505ed3d93c60e7657f00c5')
JWT_ALGORITHM = getattr(settings, 'JWT_ALGORITHM', 'HS256')


class JWTUser:
    def __init__(self, user_data):
        self.id = user_data.get('id')
        self.cpf = user_data.get('cpf')
        self.full_name = user_data.get('full_name', '')
        self.role = user_data.get('role', 'user')
        self.account_id = user_data.get('account_id')
        self.enabled_modules = user_data.get('enabled_modules', [])
        self.whatsapp_verified = user_data.get('whatsapp_verified', False)
        self.is_authenticated = True
        self.is_anonymous = False
        self.is_active = True
        self.is_staff = self.role in ['super_admin', 'admin']
        self.is_superuser = self.role == 'super_admin'
        self.username = self.cpf or str(self.id)

    def __str__(self):
        return self.full_name or self.cpf or str(self.id)

    def get_username(self):
        return self.username

    def has_perm(self, perm, obj=None):
        return self.is_superuser or self.is_staff

    def has_module_perms(self, app_label):
        return self.is_superuser or self.is_staff


class JWTAuthenticationBackend(BaseBackend):
    def authenticate(self, request, token=None):
        if not token:
            return None
        
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
        
        user_data = {
            'id': payload.get('user_id'),
            'cpf': payload.get('cpf'),
            'full_name': payload.get('full_name', ''),
            'role': payload.get('role', 'user'),
            'account_id': payload.get('account_id'),
            'enabled_modules': payload.get('enabled_modules', []),
            'whatsapp_verified': payload.get('whatsapp_verified', False),
        }
        
        if not user_data['id']:
            return None
        
        return JWTUser(user_data)

    def get_user(self, user_id):
        return None


class JWTAuthenticationMiddleware(AuthenticationMiddleware):
    def process_request(self, request):
        token = None
        
        if 'jwt_token' in request.session:
            token = request.session['jwt_token']
        elif 'token' in request.GET:
            token = request.GET.get('token')
            if token:
                request.session['jwt_token'] = token
        
        if token:
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                user_data = {
                    'id': payload.get('user_id'),
                    'cpf': payload.get('cpf'),
                    'full_name': payload.get('full_name', ''),
                    'role': payload.get('role', 'user'),
                    'account_id': payload.get('account_id'),
                    'enabled_modules': payload.get('enabled_modules', []),
                    'whatsapp_verified': payload.get('whatsapp_verified', False),
                }
                if user_data['id']:
                    request.user = JWTUser(user_data)
                    return
            except jwt.ExpiredSignatureError:
                if 'jwt_token' in request.session:
                    del request.session['jwt_token']
            except jwt.InvalidTokenError:
                if 'jwt_token' in request.session:
                    del request.session['jwt_token']
        
        request.user = JWTUser({}) if hasattr(request, 'user') and request.user.is_authenticated else type('AnonymousUser', (), {'is_authenticated': False, 'is_anonymous': True})()


def jwt_login_required(view_func):
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            current_url = request.build_absolute_uri()
            login_url = f"{APP_PORTAL_URL}/login?redirect={quote(current_url)}"
            return HttpResponseRedirect(login_url)
        return view_func(request, *args, **kwargs)
    return wrapper


def get_logout_url():
    return f"{APP_PORTAL_URL}/login"


def verify_token_with_avadmin(token):
    try:
        response = requests.get(
            f"{AVADMIN_API_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5
        )
        if response.status_code == 200:
            return response.json()
    except Exception:
        pass
    return None
