import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "src", "english-vocabulary.json");

const e = (key, word, wordHe, symbol, imageUrl) => {
  const entry = { key, word, wordHe, symbol };
  if (imageUrl) entry.imageUrl = imageUrl;
  return entry;
};

const familyImg = (key) => `/english/family/${key}.svg`;

const topics = [

  {
    id: "days",
    entries: [
      e("monday", "Monday", "יום שני", "1️⃣"),
      e("tuesday", "Tuesday", "יום שלישי", "2️⃣"),
      e("wednesday", "Wednesday", "יום רביעי", "3️⃣"),
      e("thursday", "Thursday", "יום חמישי", "4️⃣"),
      e("friday", "Friday", "יום שישי", "5️⃣"),
      e("saturday", "Saturday", "יום שבת", "6️⃣"),
      e("sunday", "Sunday", "יום ראשון", "7️⃣"),
      e("today", "Today", "היום", "📍"),
      e("tomorrow", "Tomorrow", "מחר", "🔜"),
      e("yesterday", "Yesterday", "אתמול", "⏪"),
      e("morning", "Morning", "בוקר", "🌅"),
      e("night", "Night", "לילה", "🌙"),
    ],
  },
  {
    id: "transport",
    entries: [
      e("car", "Car", "מכונית", "🚗"),
      e("bus", "Bus", "אוטובוס", "🚌"),
      e("train", "Train", "רכבת", "🚆"),
      e("bike", "Bike", "אופניים", "🚲"),
      e("plane", "Plane", "מטוס", "✈️"),
      e("boat", "Boat", "סירה", "⛵"),
      e("truck", "Truck", "משאית", "🚚"),
      e("taxi", "Taxi", "מונית", "🚕"),
      e("subway", "Subway", "רכבת תחתית", "🚇"),
      e("helicopter", "Helicopter", "מסוק", "🚁"),
      e("scooter", "Scooter", "קורקינט", "🛴"),
      e("ship", "Ship", "אונייה", "🚢"),
    ],
  },
  {
    id: "land_animals",
    entries: [
      e("dog", "Dog", "כלב", "🐕"),
      e("cat", "Cat", "חתול", "🐈"),
      e("lion", "Lion", "אריה", "🦁"),
      e("tiger", "Tiger", "נמר", "🐯"),
      e("elephant", "Elephant", "פיל", "🐘"),
      e("bear", "Bear", "דוב", "🐻"),
      e("rabbit", "Rabbit", "ארנב", "🐰"),
      e("horse", "Horse", "סוס", "🐴"),
      e("cow", "Cow", "פרה", "🐄"),
      e("pig", "Pig", "חזיר", "🐷"),
      e("sheep", "Sheep", "כבשה", "🐑"),
      e("monkey", "Monkey", "קוף", "🐒"),
    ],
  },
  {
    id: "sea_animals",
    entries: [
      e("fish", "Fish", "דג", "🐟"),
      e("whale", "Whale", "לווייתן", "🐋"),
      e("dolphin", "Dolphin", "דולפין", "🐬"),
      e("shark", "Shark", "כריש", "🦈"),
      e("octopus", "Octopus", "תמנון", "🐙"),
      e("crab", "Crab", "סרטן", "🦀"),
      e("jellyfish", "Jellyfish", "מדוזה", "🪼"),
      e("turtle", "Turtle", "צב", "🐢"),
      e("seal", "Seal", "כלב ים", "🦭"),
      e("starfish", "Starfish", "כוכב ים", "⭐"),
      e("lobster", "Lobster", "לובסטר", "🦞"),
      e("seahorse", "Seahorse", "סוס ים", "🐡"),
    ],
  },
  {
    id: "birds",
    entries: [
      e("eagle", "Eagle", "נשר", "🦅"),
      e("owl", "Owl", "ינשוף", "🦉"),
      e("parrot", "Parrot", "תוכי", "🦜"),
      e("duck", "Duck", "ברווז", "🦆"),
      e("chicken", "Chicken", "תרנגולת", "🐔"),
      e("penguin", "Penguin", "פינגווין", "🐧"),
      e("flamingo", "Flamingo", "פלמינגו", "🦩"),
      e("sparrow", "Sparrow", "דרור", "🐦"),
      e("peacock", "Peacock", "טווס", "🦚"),
      e("swan", "Swan", "ברבור", "🦢"),
      e("crow", "Crow", "עורב", "🐦‍⬛"),
      e("hummingbird", "Hummingbird", "יונק דבש", "🐥"),
    ],
  },
  {
    id: "school",
    entries: [
      e("book", "Book", "ספר", "📚"),
      e("pencil", "Pencil", "עיפרון", "✏️"),
      e("eraser", "Eraser", "מחק", "🧽"),
      e("ruler", "Ruler", "סרגל", "📏"),
      e("desk", "Desk", "שולחן", "🪑"),
      e("chair", "Chair", "כיסא", "💺"),
      e("backpack", "Backpack", "תיק", "🎒"),
      e("teacher", "Teacher", "מורה", "👩‍🏫"),
      e("student", "Student", "תלמיד", "🧑‍🎓"),
      e("bell", "Bell", "פעמון", "🔔"),
      e("crayon", "Crayon", "צבע", "🖍️"),
      e("notebook", "Notebook", "מחברת", "📓"),
    ],
  },
  {
    id: "street",
    entries: [
      e("road", "Road", "כביש", "🛣️"),
      e("light", "Light", "רמזור", "🚦"),
      e("sign", "Sign", "שלט", "🪧"),
      e("sidewalk", "Sidewalk", "מדרכה", "🚶"),
      e("bridge", "Bridge", "גשר", "🌉"),
      e("park", "Park", "פארק", "🌳"),
      e("bench", "Bench", "ספסל", "🪑"),
      e("mailbox", "Mailbox", "תיבת דואר", "📮"),
      e("trash", "Trash", "פח", "🗑️"),
      e("crosswalk", "Crosswalk", "מעבר חציה", "🚸"),
      e("fountain", "Fountain", "מזרקה", "⛲"),
      e("statue", "Statue", "פסל", "🗿"),
    ],
  },
  {
    id: "colors",
    entries: [
      e("red", "Red", "אדום", "🔴"),
      e("blue", "Blue", "כחול", "🔵"),
      e("green", "Green", "ירוק", "🟢"),
      e("yellow", "Yellow", "צהוב", "🟡"),
      e("orange", "Orange", "כתום", "🟠"),
      e("purple", "Purple", "סגול", "🟣"),
      e("pink", "Pink", "ורוד", "🩷"),
      e("brown", "Brown", "חום", "🟤"),
      e("black", "Black", "שחור", "⚫"),
      e("white", "White", "לבן", "⚪"),
      e("gray", "Gray", "אפור", "⬜"),
      e("gold", "Gold", "זהב", "✨"),
    ],
  },
  {
    id: "fruit",
    entries: [
      e("apple", "Apple", "תפוח", "🍎"),
      e("banana", "Banana", "בננה", "🍌"),
      e("orange", "Orange", "תפוז", "🍊"),
      e("grape", "Grape", "ענבים", "🍇"),
      e("strawberry", "Strawberry", "תות", "🍓"),
      e("watermelon", "Watermelon", "אבטיח", "🍉"),
      e("peach", "Peach", "אפרסק", "🍑"),
      e("pear", "Pear", "אגס", "🍐"),
      e("lemon", "Lemon", "לימון", "🍋"),
      e("cherry", "Cherry", "דובדבן", "🍒"),
      e("pineapple", "Pineapple", "אננס", "🍍"),
      e("mango", "Mango", "מנגו", "🥭"),
    ],
  },
  {
    id: "family",
    entries: [
      e("mom", "Mom", "אמא", "👩", familyImg("mom")),
      e("dad", "Dad", "אבא", "👨", familyImg("dad")),
      e("sister", "Sister", "אחות", "👧", familyImg("sister")),
      e("brother", "Brother", "אח", "👦", familyImg("brother")),
      e("baby", "Baby", "תינוק", "👶", familyImg("baby")),
      e("grandma", "Grandma", "סבתא", "👵", familyImg("grandma")),
      e("grandpa", "Grandpa", "סבא", "👴", familyImg("grandpa")),
      e("aunt", "Aunt", "דודה", "👩‍🦰", familyImg("aunt")),
      e("uncle", "Uncle", "דוד", "👨‍🦱", familyImg("uncle")),
      e("cousin", "Cousin", "בן דוד", "🧒", familyImg("cousin")),
      e("parents", "Parents", "הורים", "👨‍👩‍👧", familyImg("parents")),
      e("family", "Family", "משפחה", "👪", familyImg("family")),
    ],
  },
  {
    id: "body",
    entries: [
      e("head", "Head", "ראש", "👤"),
      e("hand", "Hand", "יד", "✋"),
      e("foot", "Foot", "רגל", "🦶"),
      e("eye", "Eye", "עין", "👁️"),
      e("ear", "Ear", "אוזן", "👂"),
      e("nose", "Nose", "אף", "👃"),
      e("mouth", "Mouth", "פה", "👄"),
      e("teeth", "Teeth", "שיניים", "🦷"),
      e("hair", "Hair", "שיער", "💇"),
      e("arm", "Arm", "זרוע", "💪"),
      e("leg", "Leg", "רגל", "🦵"),
      e("heart", "Heart", "לב", "❤️"),
    ],
  },
  {
    id: "weather",
    entries: [
      e("sun", "Sun", "שמש", "☀️"),
      e("rain", "Rain", "גשם", "🌧️"),
      e("cloud", "Cloud", "ענן", "☁️"),
      e("snow", "Snow", "שלג", "❄️"),
      e("wind", "Wind", "רוח", "💨"),
      e("storm", "Storm", "סערה", "⛈️"),
      e("rainbow", "Rainbow", "קשת", "🌈"),
      e("hot", "Hot", "חם", "🥵"),
      e("cold", "Cold", "קר", "🥶"),
      e("fog", "Fog", "ערפל", "🌫️"),
      e("lightning", "Lightning", "ברק", "⚡"),
      e("umbrella", "Umbrella", "מטריה", "☂️"),
    ],
  },
  {
    id: "clothes",
    entries: [
      e("shirt", "Shirt", "חולצה", "👕"),
      e("pants", "Pants", "מכנסיים", "👖"),
      e("shoes", "Shoes", "נעליים", "👟"),
      e("socks", "Socks", "גרביים", "🧦"),
      e("hat", "Hat", "כובע", "🧢"),
      e("coat", "Coat", "מעיל", "🧥"),
      e("dress", "Dress", "שמלה", "👗"),
      e("skirt", "Skirt", "חצאית", "👚"),
      e("gloves", "Gloves", "כפפות", "🧤"),
      e("scarf", "Scarf", "צעיף", "🧣"),
      e("jacket", "Jacket", "ז׳קט", "🦺"),
      e("boots", "Boots", "מגפיים", "👢"),
    ],
  },
  {
    id: "food",
    entries: [
      e("bread", "Bread", "לחם", "🍞"),
      e("milk", "Milk", "חלב", "🥛"),
      e("egg", "Egg", "ביצה", "🥚"),
      e("cheese", "Cheese", "גבינה", "🧀"),
      e("rice", "Rice", "אורז", "🍚"),
      e("soup", "Soup", "מרק", "🍲"),
      e("pizza", "Pizza", "פיצה", "🍕"),
      e("salad", "Salad", "סלט", "🥗"),
      e("cookie", "Cookie", "עוגיה", "🍪"),
      e("cake", "Cake", "עוגה", "🎂"),
      e("honey", "Honey", "דבש", "🍯"),
      e("butter", "Butter", "חמאה", "🧈"),
    ],
  },
  {
    id: "sports",
    entries: [
      e("ball", "Ball", "כדור", "🏐"),
      e("soccer", "Soccer", "כדורגל", "⚽"),
      e("basketball", "Basketball", "כדורסל", "🏀"),
      e("tennis", "Tennis", "טניס", "🎾"),
      e("swim", "Swim", "שחייה", "🏊"),
      e("run", "Run", "ריצה", "🏃"),
      e("jump", "Jump", "קפיצה", "🤸"),
      e("skate", "Skate", "החלקה", "⛸️"),
      e("golf", "Golf", "גולף", "⛳"),
      e("yoga", "Yoga", "יוגה", "🧘"),
      e("dance", "Dance", "ריקוד", "💃"),
      e("baseball", "Baseball", "בייסבול", "⚾"),
    ],
  },
  {
    id: "home",
    entries: [
      e("bed", "Bed", "מיטה", "🛏️"),
      e("sofa", "Sofa", "ספה", "🛋️"),
      e("table", "Table", "שולחן", "🍽️"),
      e("chair", "Chair", "כיסא", "💺"),
      e("lamp", "Lamp", "מנורה", "💡"),
      e("door", "Door", "דלת", "🚪"),
      e("window", "Window", "חלון", "🪟"),
      e("kitchen", "Kitchen", "מטבח", "🍳"),
      e("bath", "Bath", "אמבטיה", "🛁"),
      e("fridge", "Fridge", "מקרר", "🧊"),
      e("clock", "Clock", "שעון", "⏰"),
      e("mirror", "Mirror", "מראה", "🪞"),
    ],
  },
  {
    id: "jobs",
    entries: [
      e("doctor", "Doctor", "רופא", "👨‍⚕️"),
      e("teacher", "Teacher", "מורה", "👩‍🏫"),
      e("firefighter", "Firefighter", "כבאי", "👨‍🚒"),
      e("police", "Police", "שוטר", "👮"),
      e("chef", "Chef", "טבח", "👨‍🍳"),
      e("farmer", "Farmer", "חקלאי", "👨‍🌾"),
      e("pilot", "Pilot", "טייס", "👨‍✈️"),
      e("artist", "Artist", "אמן", "🎨"),
      e("nurse", "Nurse", "אחות", "👩‍⚕️"),
      e("builder", "Builder", "בנאי", "👷"),
      e("vet", "Vet", "וטרינר", "🐾"),
      e("singer", "Singer", "זמר", "🎤"),
    ],
  },
  {
    id: "nature",
    entries: [
      e("tree", "Tree", "עץ", "🌳"),
      e("flower", "Flower", "פרח", "🌸"),
      e("grass", "Grass", "דשא", "🌿"),
      e("mountain", "Mountain", "הר", "⛰️"),
      e("river", "River", "נהר", "🏞️"),
      e("lake", "Lake", "אגם", "🌊"),
      e("forest", "Forest", "יער", "🌲"),
      e("rock", "Rock", "סלע", "🪨"),
      e("leaf", "Leaf", "עלה", "🍃"),
      e("bee", "Bee", "דבורה", "🐝"),
      e("butterfly", "Butterfly", "פרפר", "🦋"),
      e("moon", "Moon", "ירח", "🌙"),
    ],
  },
  {
    id: "feelings",
    entries: [
      e("happy", "Happy", "שמח", "😊"),
      e("sad", "Sad", "עצוב", "😢"),
      e("angry", "Angry", "כועס", "😠"),
      e("scared", "Scared", "מפחד", "😨"),
      e("tired", "Tired", "עייף", "😴"),
      e("excited", "Excited", "נרגש", "🤩"),
      e("bored", "Bored", "משועמם", "😑"),
      e("proud", "Proud", "גאה", "🏅"),
      e("shy", "Shy", "ביישן", "😳"),
      e("love", "Love", "אהבה", "😍"),
      e("calm", "Calm", "רגוע", "😌"),
      e("surprised", "Surprised", "מופתע", "😲"),
    ],
  },
  {
    id: "numbers",
    entries: [
      e("one", "One", "אחת", "1️⃣"),
      e("two", "Two", "שתיים", "2️⃣"),
      e("three", "Three", "שלוש", "3️⃣"),
      e("four", "Four", "ארבע", "4️⃣"),
      e("five", "Five", "חמש", "5️⃣"),
      e("six", "Six", "שש", "6️⃣"),
      e("seven", "Seven", "שבע", "7️⃣"),
      e("eight", "Eight", "שמונה", "8️⃣"),
      e("nine", "Nine", "תשע", "9️⃣"),
      e("ten", "Ten", "עשר", "🔟"),
      e("eleven", "Eleven", "אחת עשרה", "🕚"),
      e("twelve", "Twelve", "שתים עשרה", "🕛"),
    ],
  },
  {
    id: "shapes",
    entries: [
      e("circle", "Circle", "עיגול", "⭕"),
      e("square", "Square", "ריבוע", "⬜"),
      e("triangle", "Triangle", "משולש", "🔺"),
      e("star", "Star", "כוכב", "⭐"),
      e("heart", "Heart", "לב", "❤️"),
      e("oval", "Oval", "אליפסה", "🥚"),
      e("rectangle", "Rectangle", "מלבן", "▭"),
      e("diamond", "Diamond", "יהלום", "💎"),
      e("line", "Line", "קו", "➖"),
      e("cube", "Cube", "קובייה", "🧊"),
      e("sphere", "Sphere", "כדור", "⚽"),
      e("cone", "Cone", "חרוט", "🍦"),
    ],
  },
  {
    id: "music",
    entries: [
      e("piano", "Piano", "פסנתר", "🎹"),
      e("guitar", "Guitar", "גיטרה", "🎸"),
      e("drum", "Drum", "תוף", "🥁"),
      e("violin", "Violin", "כינור", "🎻"),
      e("flute", "Flute", "חליל", "🪈"),
      e("trumpet", "Trumpet", "חצוצרה", "🎺"),
      e("microphone", "Microphone", "מיקרופון", "🎙️"),
      e("song", "Song", "שיר", "🎵"),
      e("dance", "Dance", "ריקוד", "💃"),
      e("radio", "Radio", "רדיו", "📻"),
      e("headphones", "Headphones", "אוזניות", "🎧"),
      e("notes", "Notes", "תווים", "🎶"),
    ],
  },
  {
    id: "places",
    entries: [
      e("pyramid", "Pyramid", "פירמידה", "🔺"),
      e("tower", "Tower", "מגדל", "🗼"),
      e("beach", "Beach", "חוף", "🏖️"),
      e("castle", "Castle", "טירה", "🏰"),
      e("temple", "Temple", "מקדש", "⛩️"),
      e("market", "Market", "שוק", "🏪"),
      e("museum", "Museum", "מוזיאון", "🏛️"),
      e("zoo", "Zoo", "גן חיות", "🦁"),
      e("farm", "Farm", "חווה", "🚜"),
      e("airport", "Airport", "שדה תעופה", "✈️"),
      e("harbor", "Harbor", "נמל", "⚓"),
      e("cave", "Cave", "מערה", "🕳️"),
    ],
  },
];

const EXPECTED_TOPICS = 23;
const EXPECTED_ENTRIES = 12;

if (topics.length !== EXPECTED_TOPICS) {
  throw new Error(`Expected ${EXPECTED_TOPICS} topics, got ${topics.length}`);
}

for (const topic of topics) {
  if (topic.entries.length !== EXPECTED_ENTRIES) {
    throw new Error(
      `Topic "${topic.id}" expected ${EXPECTED_ENTRIES} entries, got ${topic.entries.length}`,
    );
  }
}

const payload = { topics };
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

const stats = fs.statSync(outPath);
console.log(`Wrote ${outPath}`);
console.log(`Topics: ${topics.length}`);
console.log(`File size: ${stats.size} bytes`);
