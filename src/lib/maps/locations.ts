/* ============================================================
   TBS — Event Location Constants (Delhi, India)
   Pre-configured event locations for Delhi logistics
   ============================================================ */

export interface LocationConfig {
  id: string;
  name: string;
  type: 'AIRPORT' | 'STATION' | 'VENUE' | 'ACCOMMODATION';
  address: string;
  lat: number;
  lng: number;
}

export const DELHI_LOCATIONS: {
  venue: LocationConfig;
  airport: LocationConfig;
  stations: LocationConfig[];
  accommodations: LocationConfig[];
} = {
  venue: {
    id: 'venue-bharat-mandapam',
    name: 'Bharat Mandapam (Pragati Maidan)',
    type: 'VENUE',
    address: 'Pragati Maidan, Mathura Road, New Delhi, Delhi 110001',
    lat: 28.6183,
    lng: 77.2426,
  },
  airport: {
    id: 'airport-delhi-t3',
    name: 'Indira Gandhi International Airport (DEL) - T3',
    type: 'AIRPORT',
    address: 'Indira Gandhi International Airport, Terminal 3, New Delhi, Delhi 110037',
    lat: 28.5562,
    lng: 77.1000,
  },
  stations: [
    {
      id: 'station-ndls',
      name: 'New Delhi Railway Station (NDLS)',
      type: 'STATION',
      address: 'Bhavbhuti Marg, Ratan Lal Market, Kamla Market, Ajmeri Gate, New Delhi, Delhi 110006',
      lat: 28.6430,
      lng: 77.2194,
    },
    {
      id: 'station-anvt',
      name: 'Anand Vihar Railway Terminal (ANVT)',
      type: 'STATION',
      address: 'Anand Vihar, Delhi 110092',
      lat: 28.6469,
      lng: 77.3160,
    },
  ],
  accommodations: [
    {
      id: 'acc-taj-palace',
      name: 'Taj Palace, New Delhi',
      type: 'ACCOMMODATION',
      address: '2 Sardar Patel Marg, Diplomatic Enclave, Chanakyapuri, New Delhi, Delhi 110021',
      lat: 28.5910,
      lng: 77.1725,
    },
    {
      id: 'acc-leela-palace',
      name: 'The Leela Palace New Delhi',
      type: 'ACCOMMODATION',
      address: 'Diplomatic Enclave, Chanakyapuri, New Delhi, Delhi 110023',
      lat: 28.5804,
      lng: 77.1856,
    },
    {
      id: 'acc-itc-maurya',
      name: 'ITC Maurya, New Delhi',
      type: 'ACCOMMODATION',
      address: 'Diplomatic Enclave, Sardar Patel Marg, New Delhi, Delhi 110021',
      lat: 28.5925,
      lng: 77.1738,
    },
    {
      id: 'acc-marriott-aerocity',
      name: 'JW Marriott Hotel New Delhi Aerocity',
      type: 'ACCOMMODATION',
      address: 'Asset Area 4 - Hospitality District, Aerocity, New Delhi, Delhi 110037',
      lat: 28.5518,
      lng: 77.1215,
    },
  ],
};
