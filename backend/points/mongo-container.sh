#!/bin/bash

# Function to check if MongoDB is ready
wait_for_mongodb() {
    echo "Waiting for MongoDB to be ready..."
    while ! docker exec mongodb mongosh --eval "db.runCommand({ping:1})" &>/dev/null; do
        sleep 1
    done
    echo "MongoDB is ready!"
}

# Function to create/clear collections
manage_collections() {
    echo "Creating/Clearing collections..."
    docker exec mongodb mongosh --eval '
        try {
            db = db.getSiblingDB("points");
            
            // Drop collections with error checking
            const collections = ["points", "config", "events", "liquidityPoints", "priceFeed", "swapPoints"];
            collections.forEach(collection => {
                try {
                    db[collection].drop();
                    print(`Dropped ${collection} successfully`);
                } catch (e) {
                    print(`Error dropping ${collection}: ${e}`);
                }
            });
            
            // Create collections with error checking
            collections.forEach(collection => {
                try {
                    db.createCollection(collection);
                    print(`Created ${collection} successfully`);
                    
                    // Verify collection is empty
                    const count = db[collection].count();
                    print(`${collection} has ${count} documents`);
                } catch (e) {
                    print(`Error creating ${collection}: ${e}`);
                }
            });
        } catch (e) {
            print(`Fatal error: ${e}`);
        }
    '
}

# Main script
case "$1" in
    start)
        echo "Starting MongoDB and creating collections..."
        docker compose up -d mongo
        wait_for_mongodb
        manage_collections
        echo "MongoDB is up and collections are created!"
        ;;
    restart)
        echo "Restarting MongoDB and clearing collections..."
        docker compose restart mongo
        wait_for_mongodb
        manage_collections
        echo "MongoDB restarted and collections cleared!"
        ;;
    stop)
        echo "Stopping MongoDB..."
        docker compose stop mongo
        echo "MongoDB stopped."
        ;;
    *)
        echo "Usage: $0 {start|restart|stop}"
        echo "Note: 'restart' will clear all collections."
        exit 1
        ;;
esac

exit 0