class BackendException(Exception):
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(self.message)

class NotFoundException(BackendException):
    def __init__(self, resource: str):
        super().__init__(f"{resource} not found", code="NOT_FOUND", status_code=404)

class ValidationException(BackendException):
    def __init__(self, detail: str):
        super().__init__(detail, code="VALIDATION_ERROR", status_code=400)

class AuthException(BackendException):
    def __init__(self, detail: str):
        super().__init__(detail, code="UNAUTHORIZED", status_code=401)
