import re

with open('./backend/app/api/endpoints/settings.py', 'r') as f:
    c = f.read()

old_settings_pattern = r"DEFAULT_REGION_SETTINGS = \[\s*\{.*?\}\s*\]"
old_settings_match = re.search(old_settings_pattern, c, re.DOTALL)

if not old_settings_match:
    print("Could not find DEFAULT_REGION_SETTINGS")
    exit(1)

new_settings = """DEFAULT_REGION_SETTINGS = [
    {
        "state": "Johor",
        "districts": ["Batu Pahat", "Johor Bahru", "Kluang", "Kota Tinggi", "Kulai", "Mersing", "Muar", "Pontian", "Segamat", "Tangkak"]
    },
    {
        "state": "Kedah",
        "districts": ["Baling", "Bandar Baharu", "Kota Setar", "Kuala Muda", "Kubang Pasu", "Kulim", "Langkawi", "Padang Terap", "Pendang", "Pokok Sena", "Sik", "Yan"]
    },
    {
        "state": "Kelantan",
        "districts": ["Bachok", "Gua Musang", "Jeli", "Kota Bharu", "Kuala Krai", "Machang", "Pasir Mas", "Pasir Puteh", "Tanah Merah", "Tumpat"]
    },
    {
        "state": "Kuala Lumpur",
        "districts": ["Kuala Lumpur"]
    },
    {
        "state": "Labuan",
        "districts": ["Labuan"]
    },
    {
        "state": "Melaka",
        "districts": ["Alor Gajah", "Jasin", "Melaka Tengah"]
    },
    {
        "state": "Negeri Sembilan",
        "districts": ["Jelebu", "Jempol", "Kuala Pilah", "Port Dickson", "Rembau", "Seremban", "Tampin"]
    },
    {
        "state": "Pahang",
        "districts": ["Bentong", "Bera", "Cameron Highlands", "Jerantut", "Kuantan", "Lipis", "Maran", "Pekan", "Raub", "Rompin", "Temerloh"]
    },
    {
        "state": "Penang",
        "districts": ["Barat Daya", "Seberang Perai Selatan", "Seberang Perai Tengah", "Seberang Perai Utara", "Timur Laut"]
    },
    {
        "state": "Perak",
        "districts": ["Bagan Datuk", "Batang Padang", "Hilir Perak", "Hulu Perak", "Kampar", "Kerian", "Kinta", "Kuala Kangsar", "Larut, Matang dan Selama", "Manjung", "Muallim", "Perak Tengah"]
    },
    {
        "state": "Perlis",
        "districts": ["Perlis"]
    },
    {
        "state": "Putrajaya",
        "districts": ["Putrajaya"]
    },
    {
        "state": "Sabah",
        "districts": ["Beaufort", "Beluran", "Keningau", "Kinabatangan", "Kota Belud", "Kota Kinabalu", "Kota Marudu", "Kuala Penyu", "Kudat", "Kunak", "Lahad Datu", "Nabawan", "Papar", "Penampang", "Pitas", "Putatan", "Ranau", "Sandakan", "Semporna", "Sipitang", "Tambunan", "Tawau", "Tenom", "Tongod", "Tuaran"]
    },
    {
        "state": "Sarawak",
        "districts": ["Asajaya", "Bau", "Belaga", "Beluru", "Betong", "Bintulu", "Bukit Mabong", "Dalat", "Daro", "Julau", "Kabong", "Kanowit", "Kapit", "Kuching", "Lawas", "Limbang", "Lubok Antu", "Lundu", "Marudi", "Matu", "Meradong", "Miri", "Mukah", "Pakan", "Pusa", "Samarahan", "Saratok", "Sarikei", "Sebauh", "Selangau", "Serian", "Sibu", "Simunjan", "Song", "Sri Aman", "Subis", "Tanjung Manis", "Tatau", "Tebedu"]
    },
    {
        "state": "Selangor",
        "districts": ["Gombak", "Hulu Langat", "Hulu Selangor", "Klang", "Kuala Langat", "Kuala Selangor", "Petaling", "Sabak Bernam", "Sepang"]
    },
    {
        "state": "Terengganu",
        "districts": ["Besut", "Dungun", "Hulu Terengganu", "Kemaman", "Kuala Nerus", "Kuala Terengganu", "Marang", "Setiu"]
    }
]"""

c = c[:old_settings_match.start()] + new_settings + c[old_settings_match.end():]

with open('./backend/app/api/endpoints/settings.py', 'w') as f:
    f.write(c)
