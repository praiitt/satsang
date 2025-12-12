import os
import aiohttp
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger("suno_client")

class SunoClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("SUNO_API_KEY")
        # Updated base URL based on docs
        self.base_url = "https://api.sunoapi.org/api/v1"
        # Reusable session to avoid creating 60+ sessions during polling
        self._session: Optional[aiohttp.ClientSession] = None
        
        if not self.api_key:
            logger.warning("SUNO_API_KEY not found. Music generation will fail.")
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create the reusable aiohttp session."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session
    
    async def close(self):
        """Close the aiohttp session."""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None

    async def generate_music(
        self,
        prompt: str,
        is_instrumental: bool = False,
        custom_mode: bool = False,
        style: Optional[str] = None,
        title: Optional[str] = None,
        model: str = "V3_5",
        callback_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate music using Suno API.
        """
        if not self.api_key:
            raise ValueError("SUNO_API_KEY is not set")

        url = f"{self.base_url}/generate"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        # Construct body based on mode
        body = {
            "customMode": custom_mode,
            "instrumental": is_instrumental,
            "model": model,
        }
        
        # Add callback URL if provided
        if callback_url:
            body["callBackUrl"] = callback_url

        if custom_mode:
            if not style or not title:
                raise ValueError("Style and Title are required for Custom Mode")
            body["style"] = style
            body["title"] = title
            # In custom mode, prompt is lyrics if not instrumental
            if not is_instrumental:
                body["prompt"] = prompt
        else:
            # Non-custom mode
            body["prompt"] = prompt

        session = await self._get_session()
        try:
            async with session.post(url, headers=headers, json=body) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Suno API Error: {response.status} - {error_text}")
                    raise Exception(f"Suno API failed: {response.status} - {error_text}")
                
                return await response.json()
        except Exception as e:
            logger.error(f"Failed to generate music: {e}")
            raise

    async def get_generation_status(self, task_id: str) -> Dict[str, Any]:
        """
        Check the status of a generation task.
        """
        if not self.api_key:
            raise ValueError("SUNO_API_KEY is not set")

        url = f"{self.base_url}/generate/record-info"
        headers = {
            "Authorization": f"Bearer {self.api_key}"
        }
        params = {"taskId": task_id}

        session = await self._get_session()
        try:
            async with session.get(url, headers=headers, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Suno Status Error: {response.status} - {error_text}")
                    raise Exception(f"Suno Status failed: {response.status}")
                
                return await response.json()
        except Exception as e:
            logger.error(f"Failed to get status: {e}")
            raise
