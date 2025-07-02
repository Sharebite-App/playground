FROM python:3.13-slim

WORKDIR /src

# Install system dependencies including MySQL client and GDAL
RUN apt-get update && apt-get install -y \
    pkg-config \
    default-libmysqlclient-dev \
    build-essential \
    gdal-bin \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy over requirements.txt. If this file has changed it will break the cache
# and trigger an install to happen
COPY requirements.txt /src/requirements.txt

RUN pip3 install -r /src/requirements.txt --no-cache-dir
    
COPY . /src

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
