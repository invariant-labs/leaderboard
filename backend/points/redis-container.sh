#!/bin/bash

# Function to check if Redis is ready
wait_for_redis() {
    echo "Waiting for Redis to be ready..."
    while ! docker exec redis redis-cli ping &>/dev/null; do
        sleep 1
    done
    echo "Redis is ready!"
}

# Function to clear database
flush_data() {
    echo "Clearing database..."
    docker exec -it redis redis-cli FLUSHALL
}

# Main script
case "$1" in
    start)
        echo "Starting Redis..."
        docker compose up -d redis
        wait_for_redis
        flush_data
        echo "Redis is up!"
        ;;
    restart)
        echo "Restarting Redis and flushing data..."
        docker compose restart redis
        wait_for_redis
        flush_data
        echo "Redis restarted!"
        ;;
    stop)
        echo "Stopping Redis..."
        docker compose stop redis
        echo "Redis stopped."
        ;;
    *)
        echo "Usage: $0 {start|restart|stop}"
        echo "Note: 'restart' will clear all data."
        exit 1
        ;;
esac

exit 0