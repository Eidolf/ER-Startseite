from app.core import security
from app.core.exceptions import AuthException, ValidationException


class AuthService:
    def is_setup(self) -> bool:
        return security.is_setup()

    def setup_password(self, password: str):
        if self.is_setup():
            raise ValidationException("Already setup")
        security.setup_password(password)

    def verify_password(self, password: str) -> bool:
        if not self.is_setup():
            raise AuthException("Not setup")
        return security.check_password(password)

    def change_password(self, old_password: str, new_password: str):
        if not self.verify_password(old_password):
            raise AuthException("Invalid old password")
        security.setup_password(new_password)
