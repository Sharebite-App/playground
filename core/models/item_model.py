from django.db import models
from core.models.base_model import BaseModel
from core.models.section_model import Section

class Item(BaseModel):
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    section = models.ForeignKey(Section, on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)