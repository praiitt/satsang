import asyncio
import os
from livekit import api
from dotenv import load_dotenv

load_dotenv('.env.local')

async def check_agents():
    lkapi = api.LiveKitAPI(
        os.getenv('LIVEKIT_URL'),
        os.getenv('LIVEKIT_API_KEY'),
        os.getenv('LIVEKIT_API_SECRET'),
    )

    print(f"Connecting to {os.getenv('LIVEKIT_URL')}...")
    
    # List rooms to see if any exist
    from livekit.protocol import room as room_proto
    rooms = await lkapi.room.list_rooms(room_proto.ListRoomsRequest())
    print(f"Active Rooms: {len(rooms.rooms)}")
    for room in rooms.rooms:
        print(f" - Room: {room.name} | Participants: {room.num_participants}")

    # Check for Participants in a "likely" agent room or just generic
    # Note: Agents usually connect as participants.
    # If the user is trying to connect to a specific room, we can check that.
    # But often Agents wait for a room to be created.
    
    # We can also check if there are any ingress/egress, but agents are standard clients.
    
    await lkapi.aclose()

if __name__ == "__main__":
    asyncio.run(check_agents())
