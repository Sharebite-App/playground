import logging

from django.core.management.base import BaseCommand

from core.factories import RestaurantWithMenuFactory
from core.models.restaurant_model import Restaurant
from playground.settings import DEFAULT_ADMIN_PASSWORD
from django.contrib.auth.models import User

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    def handle(self, *args, **options):
        sync_data_fixture_service = SyncDataFixtureService()
        sync_data_fixture_service.basic_sync()
        sync_data_fixture_service.create_admin_user()

class SyncDataFixtureService:

    def create_admin_user(self):
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@playground.com',
            password=DEFAULT_ADMIN_PASSWORD
        )
        logger.info(f"Created admin user: {admin.username}")

    def basic_sync(self, target_restaurant_count: int = 50):
        current_restaurants = Restaurant.objects.filter(archive_status=False)
        current_restaurant_count = current_restaurants.count()
        logger.info(f"Found {current_restaurant_count} restaurants")

        if current_restaurant_count < target_restaurant_count:
            extra_to_make = target_restaurant_count - current_restaurant_count
            logger.info(f"Creating {extra_to_make} more restaurants")
            restaurants = RestaurantWithMenuFactory.create_batch(extra_to_make)
            logger.info(f"Created {extra_to_make} restaurants")
        else:
            logger.info(f"No need to create more restaurants")
        
        logger.info(f"Total restaurants after sync: {Restaurant.objects.filter(archive_status=False).count()}")



