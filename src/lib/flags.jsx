// Nation name to ISO2 country code mapping for flags
const NATION_TO_ISO2 = {
  'Afghanistan': 'af', 'Albania': 'al', 'Algeria': 'dz', 'Angola': 'ao',
  'Argentina': 'ar', 'Australia': 'au', 'Austria': 'at', 'Belgium': 'be',
  'Bolivia': 'bo', 'Bosnia': 'ba', 'Brazil': 'br', 'Bulgaria': 'bg',
  'Cameroon': 'cm', 'Canada': 'ca', 'Chile': 'cl', 'China': 'cn',
  'Colombia': 'co', 'Congo': 'cd', 'Costa Rica': 'cr', 'Croatia': 'hr',
  'Cuba': 'cu', 'Czech Republic': 'cz', 'Czechia': 'cz', 'Denmark': 'dk',
  'Ecuador': 'ec', 'Egypt': 'eg', 'England': 'gb-eng', 'France': 'fr',
  'Germany': 'de', 'Ghana': 'gh', 'Greece': 'gr', 'Honduras': 'hn',
  'Hungary': 'hu', 'Iceland': 'is', 'Indonesia': 'id', 'Iran': 'ir',
  'Iraq': 'iq', 'Israel': 'il', 'Italy': 'it', 'Ivory Coast': 'ci',
  "Côte d'Ivoire": 'ci', 'Jamaica': 'jm', 'Japan': 'jp', 'Jordan': 'jo',
  'Kenya': 'ke', 'Kuwait': 'kw', 'Mali': 'ml', 'Mexico': 'mx',
  'Morocco': 'ma', 'Netherlands': 'nl', 'New Zealand': 'nz',
  'Nigeria': 'ng', 'North Korea': 'kp', 'Northern Ireland': 'gb-nir',
  'Norway': 'no', 'Panama': 'pa', 'Paraguay': 'py', 'Peru': 'pe',
  'Poland': 'pl', 'Portugal': 'pt', 'Qatar': 'qa', 'Romania': 'ro',
  'Russia': 'ru', 'Saudi Arabia': 'sa', 'Scotland': 'gb-sct',
  'Senegal': 'sn', 'Serbia': 'rs', 'Slovakia': 'sk', 'Slovenia': 'si',
  'South Africa': 'za', 'South Korea': 'kr', 'Spain': 'es', 'Sweden': 'se',
  'Switzerland': 'ch', 'Turkey': 'tr', 'Türkiye': 'tr', 'Ukraine': 'ua',
  'United States': 'us', 'USA': 'us', 'Uruguay': 'uy', 'Venezuela': 've',
  'Wales': 'gb-wls', 'Zambia': 'zm', 'Zimbabwe': 'zw',
  'New Caledonia': 'nc', 'Guatemala': 'gt', 'El Salvador': 'sv',
  'Haiti': 'ht', 'Trinidad and Tobago': 'tt', 'Curaçao': 'cw',
  'Uzbekistan': 'uz', 'Bahrain': 'bh', 'Yemen': 'ye', 'Oman': 'om',
  'Thailand': 'th', 'Vietnam': 'vn', 'Philippines': 'ph',
  'Dominican Republic': 'do', 'Suriname': 'sr', 'Belize': 'bz',
  'Togo': 'tg', 'Tanzania': 'tz', 'Tunisia': 'tn', 'Cape Verde': 'cv',
  'Guinea': 'gn', 'Benin': 'bj',
  'Mozambique': 'mz', 'Comoros': 'km', 'Libya': 'ly',
}

export function getFlagUrl(nation) {
  const iso2 = NATION_TO_ISO2[nation]
  if (!iso2) return null
  return `https://flagcdn.com/24x18/${iso2}.png`
}

export function FlagImg({ nation, className = '' }) {
  const url = getFlagUrl(nation)
  if (!url) return <span className={className}>{nation}</span>
  return (
    <img
      src={url}
      alt={nation}
      title={nation}
      className={`inline-block ${className}`}
      style={{ width: 24, height: 18 }}
      onError={(e) => { e.target.style.display = 'none' }}
    />
  )
}
