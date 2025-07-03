from django import template
from django.template.defaultfilters import floatformat
from django.utils.safestring import mark_safe

register = template.Library()

@register.filter
def star_rating(value):
    """
    Convert a decimal rating (0.0-5.0) to star display HTML
    Rounds to nearest 0.5
    """
    try:
        rating = float(value)
        # Round to nearest 0.5
        rating = round(rating * 2) / 2
    except (ValueError, TypeError):
        rating = 0.0
    
    full_stars = int(rating)
    has_half_star = rating % 1 != 0
    empty_stars = 5 - full_stars - (1 if has_half_star else 0)
    
    stars_html = ""
    
    # Full stars
    for _ in range(full_stars):
        stars_html += '<i class="fas fa-star text-warning"></i>'
    
    # Half star
    if has_half_star:
        stars_html += '<i class="fas fa-star-half-alt text-warning"></i>'
    
    # Empty stars
    for _ in range(empty_stars):
        stars_html += '<i class="fas fa-star text-muted"></i>'
    
    return mark_safe(stars_html)

@register.filter
def star_rating_with_text(value):
    """
    Return star rating with text (e.g., "4.5 ★★★★★")
    """
    try:
        rating = float(value)
        rating = round(rating * 2) / 2
    except (ValueError, TypeError):
        rating = 0.0
    
    stars = star_rating(rating)
    return f"{rating} {stars}"
