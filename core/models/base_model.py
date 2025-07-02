from django.db import models

class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archive_status = models.BooleanField(default=False)

    class Meta:
        abstract = True