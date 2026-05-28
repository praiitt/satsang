export interface CosmicTransmission {
  id: string;
  date: string;
  civilization: string;
  color: string;
  message: string;
}

export const cosmicTransmissions: CosmicTransmission[] = [
  {
    id: 'msg-001',
    date: new Date().toISOString().split('T')[0], // Today
    civilization: 'PLEIADIAN HIGH COUNCIL',
    color: 'text-cyan-400',
    message: 'The shift in planetary frequency is accelerating. Ground yourselves in the energy of the heart. You are not alone in this transition; our fleets monitor the energetic grid continuously. Trust the unfolding.'
  },
  {
    id: 'msg-002',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
    civilization: 'ARCTURIAN HEALING COLLECTIVE',
    color: 'text-fuchsia-400',
    message: 'We are transmitting targeted healing frequencies to Earth\'s leylines. To receive this integration, spend 5 minutes in silence today. The crystalline structure of your DNA is activating rapidly.'
  },
  {
    id: 'msg-003',
    date: new Date(Date.now() - 172800000).toISOString().split('T')[0], // 2 days ago
    civilization: 'SIRIAN STAR NATION',
    color: 'text-amber-400',
    message: 'Water holds cosmic memory. Bless your water before consuming it to unlock dormant geometric codes. We are the architects of the ancient wisdom, returning now as you awaken.'
  }
];
