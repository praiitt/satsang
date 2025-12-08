#!/usr/bin/env python3
"""
Vedic Astrology API Client
Wrapper for astrologyapi.com REST API endpoints.
"""

import aiohttp
import os
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class AstrologyAPIClient:
    """
    Client for Vedic Astrology API (astrologyapi.com).
    Provides async methods for all astrology calculations.
    """
    
    BASE_URL = "https://json.astrologyapi.com/v1"
    
    def __init__(self):
        self.user_id = os.getenv("ASTROLOGY_API_USER_ID")
        self.api_key = os.getenv("ASTROLOGY_API_KEY")
        
        if not self.user_id or not self.api_key:
            logger.warning("Astrology API credentials not found in environment")
        
        self.auth = aiohttp.BasicAuth(self.user_id, self.api_key)
    
    async def _call_api(self, endpoint: str, data: dict) -> Optional[dict]:
        """
        Make authenticated API call.
        
        Args:
            endpoint: API endpoint (e.g., "birth_details")
            data: Request payload
            
        Returns:
            API response as dict, or None on error
        """
        if not self.user_id or not self.api_key:
            logger.error("API credentials not configured")
            return None
        
        url = f"{self.BASE_URL}/{endpoint}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    json=data,
                    auth=self.auth,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        error_text = await response.text()
                        logger.error(f"API error {response.status}: {error_text}")
                        return None
        except Exception as e:
            logger.error(f"API call failed for {endpoint}: {e}")
            return None
    
    # ============================================
    # BASIC CHART ENDPOINTS
    # ============================================
    
    async def get_birth_details(self, birth_data: dict) -> Optional[dict]:
        """
        Get basic birth details and calculations.
        
        Args:
            birth_data: {day, month, year, hour, min, lat, lon, tzone}
        """
        return await self._call_api("birth_details", birth_data)
    
    async def get_astro_details(self, birth_data: dict) -> Optional[dict]:
        """
        Get astrological details (Rashi, Lagna, Nakshatra, etc.).
        """
        return await self._call_api("astro_details", birth_data)
    
    async def get_planets(self, birth_data: dict, extended: bool = False) -> Optional[dict]:
        """
        Get planetary positions.
        
        Args:
            birth_data: Birth details
            extended: If True, returns extended planet data
        """
        endpoint = "planets/extended" if extended else "planets"
        return await self._call_api(endpoint, birth_data)
    
    async def get_bhav_madhya(self, birth_data: dict) -> Optional[dict]:
        """Get house cusps (Bhav Madhya)."""
        return await self._call_api("bhav_madhya", birth_data)
    
    async def get_vedic_horoscope(self, birth_data: dict) -> Optional[dict]:
        """
        Get complete Vedic horoscope with yogas and doshas.
        """
        return await self._call_api("vedic_horoscope", birth_data)
    
    # ============================================
    # DASHA ENDPOINTS
    # ============================================
    
    async def get_current_vdasha(
        self,
        birth_data: dict,
        all_levels: bool = False
    ) -> Optional[dict]:
        """
        Get current Vimshottari Dasha period.
        
        Args:
            birth_data: Birth details
            all_levels: If True, returns all dasha levels (MD, AD, PD, SD)
        """
        endpoint = "current_vdasha_all" if all_levels else "current_vdasha"
        return await self._call_api(endpoint, birth_data)
    
    async def get_major_vdasha(self, birth_data: dict) -> Optional[dict]:
        """Get complete Mahadasha timeline (120 years)."""
        return await self._call_api("major_vdasha", birth_data)
    
    async def get_sub_vdasha(self, birth_data: dict, mahadasha: str) -> Optional[dict]:
        """
        Get Antardasha periods for a Mahadasha.
        
        Args:
            mahadasha: Planet name (sun, moon, mars, etc.)
        """
        return await self._call_api(f"sub_vdasha/{mahadasha}", birth_data)
    
    async def get_current_chardasha(self, birth_data: dict) -> Optional[dict]:
        """Get current Char Dasha period."""
        return await self._call_api("current_chardasha", birth_data)
    
    async def get_major_chardasha(self, birth_data: dict) -> Optional[dict]:
        """Get complete Char Dasha timeline."""
        return await self._call_api("major_chardasha", birth_data)
    
    # ============================================
    # DOSHA ENDPOINTS
    # ============================================
    
    async def check_manglik(self, birth_data: dict) -> Optional[dict]:
        """Check for Manglik Dosha."""
        return await self._call_api("manglik", birth_data)
    
    async def get_manglik_remedy(self, birth_data: dict) -> Optional[dict]:
        """Get Manglik Dosha remedies."""
        return await self._call_api("manglik_remedy", birth_data)
    
    async def check_kalsarpa(self, birth_data: dict) -> Optional[dict]:
        """Check for Kalsarpa Dosha."""
        return await self._call_api("kalsarpa_details", birth_data)
    
    async def get_kalsarpa_remedy(self, birth_data: dict) -> Optional[dict]:
        """Get Kalsarpa Dosha remedies."""
        return await self._call_api("kalsarpa_remedy", birth_data)
    
    async def get_pitra_dosha_report(self, birth_data: dict) -> Optional[dict]:
        """Get Pitra Dosha analysis."""
        return await self._call_api("pitra_dosha_report", birth_data)
    
    async def get_sadhesati_current_status(self, birth_data: dict) -> Optional[dict]:
        """Get current Sadhesati status."""
        return await self._call_api("sadhesati_current_status", birth_data)
    
    async def get_sadhesati_remedies(self, birth_data: dict) -> Optional[dict]:
        """Get Sadhesati remedies."""
        return await self._call_api("sadhesati_remedies", birth_data)
    
    # ============================================
    # HOROSCOPE PREDICTIONS
    # ============================================
    
    async def get_daily_horoscope(
        self,
        zodiac: str,
        timezone: float = 5.5
    ) -> Optional[dict]:
        """
        Get daily horoscope prediction.
        
        Args:
            zodiac: Zodiac sign (aries, taurus, etc.)
            timezone: Timezone offset
        """
        return await self._call_api(
            f"horoscope_prediction/daily/{zodiac.lower()}",
            {"timezone": timezone}
        )
    
    async def get_weekly_horoscope(
        self,
        zodiac: str,
        timezone: float = 5.5
    ) -> Optional[dict]:
        """Get weekly horoscope prediction."""
        return await self._call_api(
            f"horoscope_prediction/weekly/{zodiac.lower()}",
            {"timezone": timezone}
        )
    
    async def get_monthly_horoscope(
        self,
        zodiac: str,
        timezone: float = 5.5
    ) -> Optional[dict]:
        """Get monthly horoscope prediction."""
        return await self._call_api(
            f"horoscope_prediction/monthly/{zodiac.lower()}",
            {"timezone": timezone}
        )
    
    async def get_daily_nakshatra_prediction(
        self,
        birth_data: dict
    ) -> Optional[dict]:
        """Get daily prediction based on Nakshatra."""
        return await self._call_api("daily_nakshatra_prediction", birth_data)
    
    # ============================================
    # PANCHANG ENDPOINTS
    # ============================================
    
    async def get_basic_panchang(self, date_data: dict) -> Optional[dict]:
        """
        Get basic Panchang for a date.
        
        Args:
            date_data: {day, month, year, hour, min, lat, lon, tzone}
        """
        return await self._call_api("basic_panchang", date_data)
    
    async def get_advanced_panchang(self, date_data: dict) -> Optional[dict]:
        """Get advanced Panchang with detailed timings."""
        return await self._call_api("advanced_panchang", date_data)
    
    async def get_hora_muhurta(self, date_data: dict) -> Optional[dict]:
        """Get Hora Muhurta timings."""
        return await self._call_api("hora_muhurta", date_data)
    
    async def get_chaughadiya_muhurta(self, date_data: dict) -> Optional[dict]:
        """Get Chaughadiya Muhurta timings."""
        return await self._call_api("chaughadiya_muhurta", date_data)
    
    # ============================================
    # REMEDIES
    # ============================================
    
    async def get_gem_suggestion(self, birth_data: dict) -> Optional[dict]:
        """Get gemstone suggestions."""
        return await self._call_api("basic_gem_suggestion", birth_data)
    
    async def get_rudraksha_suggestion(self, birth_data: dict) -> Optional[dict]:
        """Get Rudraksha suggestions."""
        return await self._call_api("rudraksha_suggestion", birth_data)
    
    async def get_puja_suggestion(self, birth_data: dict) -> Optional[dict]:
        """Get Puja suggestions."""
        return await self._call_api("puja_suggestion", birth_data)
    
    # ============================================
    # MATCHMAKING
    # ============================================
    
    async def get_ashtakoot_points(self, match_data: dict) -> Optional[dict]:
        """
        Get Ashtakoot compatibility points.
        
        Args:
            match_data: Contains m_day, m_month, ... f_day, f_month, etc.
        """
        return await self._call_api("match_ashtakoot_points", match_data)
    
    async def get_match_making_report(self, match_data: dict) -> Optional[dict]:
        """Get complete matchmaking report."""
        return await self._call_api("match_making_report", match_data)
    
    async def get_match_percentage(self, match_data: dict) -> Optional[dict]:
        """Get compatibility percentage."""
        return await self._call_api("match_percentage", match_data)
    
    # ============================================
    # CHART REPORTS
    # ============================================
    
    async def get_planet_report(
        self,
        birth_data: dict,
        planet: str,
        report_type: str = "rashi"
    ) -> Optional[dict]:
        """
        Get detailed planet report.
        
        Args:
            planet: Planet name (sun, moon, etc.)
            report_type: "rashi" or "house"
        """
        endpoint = f"general_{report_type}_report/{planet.lower()}"
        return await self._call_api(endpoint, birth_data)
    
    async def get_nakshatra_report(self, birth_data: dict) -> Optional[dict]:
        """Get Nakshatra analysis report."""
        return await self._call_api("general_nakshatra_report", birth_data)
    
    async def get_ascendant_report(self, birth_data: dict) -> Optional[dict]:
        """Get Ascendant (Lagna) analysis report."""
        return await self._call_api("general_ascendant_report", birth_data)


# Singleton instance
_api_client_instance = None


def get_api_client() -> AstrologyAPIClient:
    """Get singleton API client instance."""
    global _api_client_instance
    if _api_client_instance is None:
        _api_client_instance = AstrologyAPIClient()
    return _api_client_instance
