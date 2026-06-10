// Nation name → flag emoji
const NATION_TO_EMOJI = {
  'Afghanistan': '🇦🇫', 'Albania': '🇦🇱', 'Algeria': '🇩🇿', 'Angola': '🇦🇴',
  'Argentina': '🇦🇷', 'Australia': '🇦🇺', 'Austria': '🇦🇹', 'Azerbaijan': '🇦🇿',
  'Bahrain': '🇧🇭', 'Belgium': '🇧🇪', 'Bolivia': '🇧🇴', 'Bosnia': '🇧🇦',
  'Bosnia and Herzegovina': '🇧🇦', 'Brazil': '🇧🇷', 'Bulgaria': '🇧🇬',
  'Cameroon': '🇨🇲', 'Canada': '🇨🇦', 'Cape Verde': '🇨🇻', 'Chile': '🇨🇱',
  'China': '🇨🇳', 'Colombia': '🇨🇴', 'Congo': '🇨🇬', 'Costa Rica': '🇨🇷',
  'Croatia': '🇭🇷', 'Cuba': '🇨🇺', 'Czech Republic': '🇨🇿', 'Czechia': '🇨🇿',
  'Denmark': '🇩🇰', 'Dominican Republic': '🇩🇴', 'Ecuador': '🇪🇨',
  'Egypt': '🇪🇬', 'El Salvador': '🇸🇻', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'France': '🇫🇷', 'Germany': '🇩🇪', 'Ghana': '🇬🇭', 'Greece': '🇬🇷',
  'Guatemala': '🇬🇹', 'Guinea': '🇬🇳', 'Haiti': '🇭🇹', 'Honduras': '🇭🇳',
  'Hungary': '🇭🇺', 'Iceland': '🇮🇸', 'India': '🇮🇳', 'Indonesia': '🇮🇩',
  'Iran': '🇮🇷', 'Iraq': '🇮🇶', 'Israel': '🇮🇱', 'Italy': '🇮🇹',
  "Ivory Coast": '🇨🇮', "Côte d'Ivoire": '🇨🇮', 'Jamaica': '🇯🇲',
  'Japan': '🇯🇵', 'Jordan': '🇯🇴', 'Kenya': '🇰🇪', 'Kuwait': '🇰🇼',
  'Mali': '🇲🇱', 'Mexico': '🇲🇽', 'Morocco': '🇲🇦', 'Mozambique': '🇲🇿',
  'Netherlands': '🇳🇱', 'New Zealand': '🇳🇿', 'Nigeria': '🇳🇬',
  'North Korea': '🇰🇵', 'Northern Ireland': '🇬🇧', 'Norway': '🇳🇴',
  'Oman': '🇴🇲', 'Panama': '🇵🇦', 'Paraguay': '🇵🇾', 'Peru': '🇵🇪',
  'Philippines': '🇵🇭', 'Poland': '🇵🇱', 'Portugal': '🇵🇹', 'Qatar': '🇶🇦',
  'Romania': '🇷🇴', 'Russia': '🇷🇺', 'Saudi Arabia': '🇸🇦', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Senegal': '🇸🇳', 'Serbia': '🇷🇸', 'Slovakia': '🇸🇰', 'Slovenia': '🇸🇮',
  'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'Spain': '🇪🇸', 'Sweden': '🇸🇪',
  'Switzerland': '🇨🇭', 'Syria': '🇸🇾', 'Thailand': '🇹🇭', 'Togo': '🇹🇬',
  'Trinidad and Tobago': '🇹🇹', 'Tunisia': '🇹🇳', 'Turkey': '🇹🇷',
  'Türkiye': '🇹🇷', 'Ukraine': '🇺🇦', 'United States': '🇺🇸', 'USA': '🇺🇸',
  'Uruguay': '🇺🇾', 'Uzbekistan': '🇺🇿', 'Venezuela': '🇻🇪', 'Vietnam': '🇻🇳',
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Zambia': '🇿🇲', 'Zimbabwe': '🇿🇼',
  'New Caledonia': '🇳🇨', 'Curaçao': '🇨🇼', 'Suriname': '🇸🇷',
  'Belize': '🇧🇿', 'Tanzania': '🇹🇿', 'Benin': '🇧🇯', 'Comoros': '🇰🇲',
  'Libya': '🇱🇾', 'Guatemala': '🇬🇹',
}

export function getFlag(nation) {
  return NATION_TO_EMOJI[nation] || '🏳'
}
