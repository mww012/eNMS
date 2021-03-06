from json import dumps
from requests.auth import HTTPBasicAuth
from sqlalchemy import Boolean, ForeignKey, Integer
from sqlalchemy.types import JSON
from wtforms import (
    BooleanField,
    HiddenField,
    IntegerField,
    PasswordField,
    SelectField,
    StringField,
)

from eNMS import app
from eNMS.database.dialect import Column, LargeString, SmallString
from eNMS.forms.automation import ServiceForm
from eNMS.forms.fields import (
    DictSubstitutionField,
    JsonSubstitutionField,
    SubstitutionField,
)
from eNMS.models.automation import Service


class RestCallService(Service):

    __tablename__ = "rest_call_service"
    pretty_name = "REST Call"
    id = Column(Integer, ForeignKey("service.id"), primary_key=True)
    call_type = Column(SmallString)
    rest_url = Column(LargeString, default="")
    payload = Column(JSON, default={})
    params = Column(JSON, default={})
    headers = Column(JSON, default={})
    verify_ssl_certificate = Column(Boolean, default=True)
    timeout = Column(Integer, default=15)
    username = Column(SmallString)
    password = Column(SmallString)

    __mapper_args__ = {"polymorphic_identity": "rest_call_service"}

    def job(self, run, payload, device=None):
        rest_url = run.sub(run.rest_url, locals())
        run.log("info", f"Sending REST Call to {rest_url}", device)
        kwargs = {
            p: run.sub(getattr(self, p), locals())
            for p in ("headers", "params", "timeout")
        }
        kwargs["verify"] = run.verify_ssl_certificate
        if self.username:
            kwargs["auth"] = HTTPBasicAuth(self.username, self.password)
        if run.call_type in ("POST", "PUT", "PATCH"):
            kwargs["data"] = dumps(run.sub(run.payload, locals()))
        call = getattr(app.request_session, run.call_type.lower())
        response = call(rest_url, **kwargs)
        if response.status_code not in range(200, 300):
            result = {
                "success": False,
                "response_code": response.status_code,
                "response": response.text,
            }
            if response.status_code == 401:
                result["result"] = "Wrong credentials supplied."
            return result
        return {
            "url": rest_url,
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "result": response.text,
        }


class RestCallForm(ServiceForm):
    form_type = HiddenField(default="rest_call_service")
    call_type = SelectField(
        choices=(
            ("GET", "GET"),
            ("POST", "POST"),
            ("PUT", "PUT"),
            ("DELETE", "DELETE"),
            ("PATCH", "PATCH"),
        )
    )
    rest_url = SubstitutionField()
    payload = JsonSubstitutionField()
    params = DictSubstitutionField()
    headers = DictSubstitutionField()
    verify_ssl_certificate = BooleanField("Verify SSL Certificate")
    timeout = IntegerField(default=15)
    username = StringField()
    password = PasswordField()
