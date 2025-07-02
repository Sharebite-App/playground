from django.db import models
from core.models.base_model import BaseModel
from core.models.restaurant_model import Restaurant

class Section(BaseModel):
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE)
