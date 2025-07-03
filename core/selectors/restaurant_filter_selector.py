from core.models.restaurant_model import Restaurant
from dataclasses import dataclass

@dataclass
class RestaurantFilterOptions:
    search: str | None

class RestaurantFilterSelector:
    def __init__(self, options: RestaurantFilterOptions):
        self.options = options

    def get_restaurants(self):
        if self.options.search:
            # TODO: Implement search logic
            return Restaurant.objects.none()
        return Restaurant.objects.filter(archive_status=False).order_by('-rating')