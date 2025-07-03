from core.models.restaurant_model import Restaurant
from core.models.section_model import Section
from core.models.item_model import Item
import factory
from factory import Faker, SubFactory, LazyAttribute
from decimal import Decimal
import random

RESTAURANT_PREFIXES = ['The', 'Golden', 'Silver', 'Copper', 'Iron', 'Steel', 'Famous', "Joe's", 'Tasty', 'New York', 'Chicago', 'Vegan',]
RESTAURANT_SUFFIXES = ['Fork', 'Spoon', 'Knife', 'Plate', 'Bowl', 'Pot', 'Pan', 'Burger', 'Pizza', 'Diner', 'Restaurant', 'Bar and Grill', 'Bistro',]

def generate_restaurant_name():
    prefix = random.choice(RESTAURANT_PREFIXES)
    suffix = random.choice(RESTAURANT_SUFFIXES)
    return f"{prefix} {suffix}"

class RestaurantFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Restaurant
    
    name = factory.LazyFunction(generate_restaurant_name)
    address = Faker('street_address')
    city = Faker('city')
    state = Faker('state_abbr')
    zip_code = Faker('postcode')
    country = 'USA'
    phone = Faker('phone_number')
    email = Faker('company_email')
    rating = LazyAttribute(lambda x: Decimal(str(random.uniform(1.0, 5.0))))


class SectionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Section
    
    name = factory.Iterator([
        'Appetizers', 'Starters', 'Soups & Salads', 'Main Course', 
        'Burgers & Sandwiches', 'Pizza', 'Pasta', 'Seafood', 
        'Steaks & Grills', 'Vegetarian', 'Desserts', 'Beverages',
        'Coffee & Tea', 'Alcoholic Beverages', 'Kids Menu'
    ])
    description = Faker('text', max_nb_chars=200)
    restaurant = SubFactory(RestaurantFactory)


class ItemFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Item
    
    name = factory.Iterator([
        # Appetizers
        'Bruschetta', 'Mozzarella Sticks', 'Garlic Bread', 'Spinach Artichoke Dip',
        'Buffalo Wings', 'Calamari', 'Spring Rolls', 'Nachos',
        
        # Main Courses
        'Grilled Salmon', 'Chicken Parmesan', 'Beef Tenderloin', 'Pasta Carbonara',
        'Margherita Pizza', 'Caesar Salad', 'Fish Tacos', 'Vegetable Stir Fry',
        
        # Burgers & Sandwiches
        'Classic Cheeseburger', 'Chicken Club Sandwich', 'Veggie Burger', 'BLT',
        'Turkey Reuben', 'Philly Cheesesteak', 'Portobello Mushroom Burger',
        
        # Desserts
        'Chocolate Lava Cake', 'New York Cheesecake', 'Tiramisu', 'Apple Pie',
        'Ice Cream Sundae', 'Chocolate Chip Cookies', 'Key Lime Pie',
        
        # Beverages
        'Fresh Lemonade', 'Iced Tea', 'Coca Cola', 'Coffee', 'Espresso',
        'Craft Beer', 'House Red Wine', 'Mojito', 'Margarita'
    ])
    
    description = Faker('text', max_nb_chars=150)
    price = LazyAttribute(lambda x: Decimal(str(random.uniform(5.99, 29.99)).split('.')[0] + '.' + str(random.uniform(5.99, 29.99)).split('.')[1][:2]))
    is_active = True
    section = SubFactory(SectionFactory)


# Convenience factories for creating complete menu structures
class MenuSectionFactory(SectionFactory):
    """Factory for creating sections with realistic restaurant names"""
    
    @factory.post_generation
    def create_items(self, create, extracted, **kwargs):
        if not create:
            return
        
        # Create 3-8 items per section
        num_items = random.randint(3, 8)
        for _ in range(num_items):
            ItemFactory(section=self)


class RestaurantWithMenuFactory(RestaurantFactory):
    """Factory for creating restaurants with full menus"""
    
    @factory.post_generation
    def create_sections(self, create, extracted, **kwargs):
        if not create:
            return
        
        # Create 4-8 sections per restaurant
        num_sections = random.randint(4, 8)
        sections = []
        
        for _ in range(num_sections):
            section = MenuSectionFactory(restaurant=self)
            sections.append(section)
        
        return sections