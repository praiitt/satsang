import os
import aiohttp
import logging
import json
from typing import Optional, Dict, Any

logger = logging.getLogger("fal_client")

class FalClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("FAL_KEY")
        # fal.ai queue URL
        self.base_url = "https://queue.fal.run"
        self._session: Optional[aiohttp.ClientSession] = None
        
        if not self.api_key:
            logger.warning("FAL_KEY not found. Fal.ai generation will fail.")
    
    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session
    
    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None

    async def generate_music(
        self,
        prompt: str,
        model_id: str = "fal-ai/stable-audio",
        callback_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Submit an audio generation request to fal.ai's queue.
        """
        if not self.api_key:
            raise ValueError("FAL_KEY is not set")

        url = f"{self.base_url}/{model_id}"
        
        headers = {
            "Authorization": f"Key {self.api_key}",
            "Content-Type": "application/json"
        }

        # Payload depends heavily on the specific fal.ai model. 
        # Using a generic prompt payload common to most audio models.
        body = {
            "prompt": prompt,
        }
        
        # If callback is provided, add it to the webhook URL
        if callback_url:
            body["webhook_url"] = callback_url

        session = await self._get_session()
        try:
            async with session.post(url, headers=headers, json=body) as response:
                if response.status not in (200, 202):
                    error_text = await response.text()
                    logger.error(f"Fal API Error: {response.status} - {error_text}")
                    raise Exception(f"Fal API failed: {response.status} - {error_text}")
                
                result = await response.json()
                
                # Format to be somewhat compatible with our internal task_id tracking
                return {
                    "code": 200,
                    "msg": "success",
                    "data": {
                        "taskId": result.get("request_id")
                    },
                    "raw_result": result
                }
        except Exception as e:
            logger.error(f"Failed to submit to Fal: {e}")
            raise
