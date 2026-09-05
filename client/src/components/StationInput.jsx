import { useMemo, useState } from 'react';

const STATIONS = [
  { name: 'Patna Jn.', code: 'PNBE', district: 'Patna', state: 'Bihar', aliases: ['patna', 'patna junction'] },
  { name: 'Katihar Jn.', code: 'KIR', district: 'Katihar', state: 'Bihar', aliases: ['katihar', 'katihar junction'] },
  { name: 'Danapur', code: 'DNR', district: 'Patna', state: 'Bihar', aliases: ['danapur junction'] },
  { name: 'Rajendra Nagar T.', code: 'RJPB', district: 'Patna', state: 'Bihar', aliases: ['rajendra nagar', 'rajendra nagar terminal'] },
  { name: 'Gaya Jn.', code: 'GAYA', district: 'Gaya', state: 'Bihar', aliases: ['gaya', 'gaya junction'] },
  { name: 'Ara Jn.', code: 'ARA', district: 'Bhojpur', state: 'Bihar', aliases: ['ara', 'ara junction'] },
  { name: 'Barauni Jn.', code: 'BJU', district: 'Begusarai', state: 'Bihar', aliases: ['barauni', 'barauni junction'] },
  { name: 'Samastipur Jn.', code: 'SPJ', district: 'Samastipur', state: 'Bihar', aliases: ['samastipur', 'samastipur junction'] },
  { name: 'Darbhanga Jn.', code: 'DBG', district: 'Darbhanga', state: 'Bihar', aliases: ['darbhanga', 'darbhanga junction'] },
  { name: 'Purnea Jn.', code: 'PRNA', district: 'Purnia', state: 'Bihar', aliases: ['purnea', 'purnia', 'purnea junction'] },
  { name: 'Kishanganj', code: 'KNE', district: 'Kishanganj', state: 'Bihar', aliases: ['kishanganj'] },
  { name: 'Hajipur Jn.', code: 'HJP', district: 'Vaishali', state: 'Bihar', aliases: ['hajipur', 'hajipur junction'] },
  { name: 'Sonpur Jn.', code: 'SEE', district: 'Saran', state: 'Bihar', aliases: ['sonpur', 'sonpur junction'] },
  { name: 'Chhapra Jn.', code: 'CPR', district: 'Saran', state: 'Bihar', aliases: ['chhapra', 'chapra', 'chhapra junction'] },
  { name: 'Sasaram', code: 'SSM', district: 'Rohtas', state: 'Bihar', aliases: ['sasaram'] },
  { name: 'Buxar', code: 'BXR', district: 'Buxar', state: 'Bihar', aliases: ['buxar'] },
  { name: 'Mokama Jn.', code: 'MKA', district: 'Patna', state: 'Bihar', aliases: ['mokama', 'mokama junction'] },
  { name: 'Bakhtiyarpur Jn.', code: 'BKP', district: 'Patna', state: 'Bihar', aliases: ['bakhtiyarpur'] },
  { name: 'Jamalpur Jn.', code: 'JMP', district: 'Munger', state: 'Bihar', aliases: ['jamalpur', 'jamalpur junction'] },
  { name: 'Munger', code: 'MGR', district: 'Munger', state: 'Bihar', aliases: ['munger'] },
  { name: 'Saharsa Jn.', code: 'SHC', district: 'Saharsa', state: 'Bihar', aliases: ['saharsa', 'saharsa junction'] },
  { name: 'Raxaul Jn.', code: 'RXL', district: 'East Champaran', state: 'Bihar', aliases: ['raxaul', 'raxaul junction'] },
  { name: 'Bettiah', code: 'BTH', district: 'West Champaran', state: 'Bihar', aliases: ['bettiah'] },
  { name: 'Muzaffarpur Jn.', code: 'MFP', district: 'Muzaffarpur', state: 'Bihar', aliases: ['muzaffarpur', 'muzaffarpur junction'] },
  { name: 'Bhagalpur', code: 'BGP', district: 'Bhagalpur', state: 'Bihar', aliases: ['bhagalpur junction'] },
  { name: 'Ranchi Jn.', code: 'RNC', district: 'Ranchi', state: 'Jharkhand', aliases: ['ranchi', 'ranchi junction'] },
  { name: 'New Delhi', code: 'NDLS', district: 'New Delhi', state: 'Delhi', aliases: ['delhi', 'new delhi railway station'] },
  { name: 'Howrah Jn.', code: 'HWH', district: 'Howrah', state: 'West Bengal', aliases: ['howrah', 'howrah junction'] },
  { name: 'Kolkata', code: 'KOAA', district: 'Kolkata', state: 'West Bengal', aliases: ['kolkata terminal'] },
  { name: 'Mumbai Central', code: 'MMCT', district: 'Mumbai City', state: 'Maharashtra', aliases: ['mumbai', 'bombay'] },
  { name: 'Chhatrapati Shivaji Maharaj Terminus', code: 'CSMT', district: 'Mumbai City', state: 'Maharashtra', aliases: ['csmt', 'cst'] },
  { name: 'Chennai Central', code: 'MAS', district: 'Chennai', state: 'Tamil Nadu', aliases: ['chennai', 'madras'] },
  { name: 'Bengaluru Cantt.', code: 'BNC', district: 'Bengaluru Urban', state: 'Karnataka', aliases: ['bangalore', 'bengaluru cantonment'] },
  { name: 'Secunderabad Jn.', code: 'SC', district: 'Hyderabad', state: 'Telangana', aliases: ['secunderabad', 'hyderabad'] },
  { name: 'Ahmedabad Jn.', code: 'ADI', district: 'Ahmedabad', state: 'Gujarat', aliases: ['ahmedabad'] },
  { name: 'Jaipur Jn.', code: 'JP', district: 'Jaipur', state: 'Rajasthan', aliases: ['jaipur'] },
  { name: 'Lucknow Charbagh NR', code: 'LKO', district: 'Lucknow', state: 'Uttar Pradesh', aliases: ['lucknow', 'charbagh'] },
  { name: 'Varanasi Jn.', code: 'BSB', district: 'Varanasi', state: 'Uttar Pradesh', aliases: ['varanasi', 'banaras', 'benares'] },
  { name: 'Bhopal Jn.', code: 'BPL', district: 'Bhopal', state: 'Madhya Pradesh', aliases: ['bhopal'] },
  { name: 'Bhubaneswar', code: 'BBS', district: 'Khordha', state: 'Odisha', aliases: ['bhubaneswar'] },
  { name: 'Guwahati', code: 'GHY', district: 'Kamrup Metropolitan', state: 'Assam', aliases: ['guwahati'] },
  { name: 'Thiruvananthapuram Central', code: 'TVC', district: 'Thiruvananthapuram', state: 'Kerala', aliases: ['trivandrum', 'thiruvananthapuram'] },
  { name: 'Amritsar Jn.', code: 'ASR', district: 'Amritsar', state: 'Punjab', aliases: ['amritsar'] }
];

export default function StationInput({ value, onChange, placeholder = 'Type station name or code', id }) {
  const [open, setOpen] = useState(false);
  const query = String(value || '').trim().toLowerCase();
  const options = useMemo(() => {
    if (!query) return STATIONS;
    return STATIONS.filter(station => [station.name, station.code, station.district, station.state, ...station.aliases]
      .some(term => term.toLowerCase().includes(query)));
  }, [query]);

  const choose = (station) => {
    onChange(station.name);
    setOpen(false);
  };

  return (
    <div className="station-picker">
      <input
        id={id}
        value={value || ''}
        placeholder={placeholder}
        autoComplete="off"
        onChange={event => { onChange(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && <div className="station-options">
        {options.length ? options.map(station => (
          <button type="button" key={station.code} onMouseDown={() => choose(station)}>
            <span><b>{station.name}</b><em>{station.district}, {station.state}</em></span><small>{station.code}</small>
          </button>
        )) : <div className="station-empty">No matching station. You can keep the typed value.</div>}
      </div>}
    </div>
  );
}
