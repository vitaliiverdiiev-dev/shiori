import type {
  KanaRowDefinition,
  KanaScript,
  KanaScriptInfo,
  KanaSection,
  KanaSectionInfo,
} from './types';

export const kanaScripts = {
  hiragana: { label: 'Hiragana', nativeLabel: 'ひらがな' },
  katakana: { label: 'Katakana', nativeLabel: 'カタカナ' },
} as const satisfies Record<KanaScript, KanaScriptInfo>;

export const kanaSections = {
  basic: {
    description: 'Gojūon, the core characters.',
    title: 'Basic',
  },
  dakuten: {
    description: 'Voiced and semi-voiced characters marked with ゛ or ゜.',
    title: 'Dakuten & handakuten',
  },
  yoon: {
    description: 'Combinations with a small ya, yu or yo.',
    title: 'Yōon',
  },
} as const satisfies Record<KanaSection, KanaSectionInfo>;

export const kanaSectionOrder: readonly KanaSection[] = [
  'basic',
  'dakuten',
  'yoon',
];

// INVARIANT: Sound ids (Nihon-shiki romanization) are persisted as part of kana ids; never rename or reuse one.
export const kanaRows: readonly KanaRowDefinition[] = [
  {
    id: 'a',
    section: 'basic',
    sounds: [
      { id: 'a', hiragana: 'あ', katakana: 'ア', romaji: 'a' },
      { id: 'i', hiragana: 'い', katakana: 'イ', romaji: 'i' },
      { id: 'u', hiragana: 'う', katakana: 'ウ', romaji: 'u' },
      { id: 'e', hiragana: 'え', katakana: 'エ', romaji: 'e' },
      { id: 'o', hiragana: 'お', katakana: 'オ', romaji: 'o' },
    ],
  },
  {
    id: 'ka',
    section: 'basic',
    sounds: [
      { id: 'ka', hiragana: 'か', katakana: 'カ', romaji: 'ka' },
      { id: 'ki', hiragana: 'き', katakana: 'キ', romaji: 'ki' },
      { id: 'ku', hiragana: 'く', katakana: 'ク', romaji: 'ku' },
      { id: 'ke', hiragana: 'け', katakana: 'ケ', romaji: 'ke' },
      { id: 'ko', hiragana: 'こ', katakana: 'コ', romaji: 'ko' },
    ],
  },
  {
    id: 'sa',
    section: 'basic',
    sounds: [
      { id: 'sa', hiragana: 'さ', katakana: 'サ', romaji: 'sa' },
      {
        id: 'si',
        alternatives: ['si'],
        hiragana: 'し',
        katakana: 'シ',
        romaji: 'shi',
      },
      { id: 'su', hiragana: 'す', katakana: 'ス', romaji: 'su' },
      { id: 'se', hiragana: 'せ', katakana: 'セ', romaji: 'se' },
      { id: 'so', hiragana: 'そ', katakana: 'ソ', romaji: 'so' },
    ],
  },
  {
    id: 'ta',
    section: 'basic',
    sounds: [
      { id: 'ta', hiragana: 'た', katakana: 'タ', romaji: 'ta' },
      {
        id: 'ti',
        alternatives: ['ti'],
        hiragana: 'ち',
        katakana: 'チ',
        romaji: 'chi',
      },
      {
        id: 'tu',
        alternatives: ['tu'],
        hiragana: 'つ',
        katakana: 'ツ',
        romaji: 'tsu',
      },
      { id: 'te', hiragana: 'て', katakana: 'テ', romaji: 'te' },
      { id: 'to', hiragana: 'と', katakana: 'ト', romaji: 'to' },
    ],
  },
  {
    id: 'na',
    section: 'basic',
    sounds: [
      { id: 'na', hiragana: 'な', katakana: 'ナ', romaji: 'na' },
      { id: 'ni', hiragana: 'に', katakana: 'ニ', romaji: 'ni' },
      { id: 'nu', hiragana: 'ぬ', katakana: 'ヌ', romaji: 'nu' },
      { id: 'ne', hiragana: 'ね', katakana: 'ネ', romaji: 'ne' },
      { id: 'no', hiragana: 'の', katakana: 'ノ', romaji: 'no' },
    ],
  },
  {
    id: 'ha',
    section: 'basic',
    sounds: [
      { id: 'ha', hiragana: 'は', katakana: 'ハ', romaji: 'ha' },
      { id: 'hi', hiragana: 'ひ', katakana: 'ヒ', romaji: 'hi' },
      {
        id: 'hu',
        alternatives: ['hu'],
        hiragana: 'ふ',
        katakana: 'フ',
        romaji: 'fu',
      },
      { id: 'he', hiragana: 'へ', katakana: 'ヘ', romaji: 'he' },
      { id: 'ho', hiragana: 'ほ', katakana: 'ホ', romaji: 'ho' },
    ],
  },
  {
    id: 'ma',
    section: 'basic',
    sounds: [
      { id: 'ma', hiragana: 'ま', katakana: 'マ', romaji: 'ma' },
      { id: 'mi', hiragana: 'み', katakana: 'ミ', romaji: 'mi' },
      { id: 'mu', hiragana: 'む', katakana: 'ム', romaji: 'mu' },
      { id: 'me', hiragana: 'め', katakana: 'メ', romaji: 'me' },
      { id: 'mo', hiragana: 'も', katakana: 'モ', romaji: 'mo' },
    ],
  },
  {
    id: 'ya',
    section: 'basic',
    sounds: [
      { id: 'ya', hiragana: 'や', katakana: 'ヤ', romaji: 'ya' },
      null,
      { id: 'yu', hiragana: 'ゆ', katakana: 'ユ', romaji: 'yu' },
      null,
      { id: 'yo', hiragana: 'よ', katakana: 'ヨ', romaji: 'yo' },
    ],
  },
  {
    id: 'ra',
    section: 'basic',
    sounds: [
      { id: 'ra', hiragana: 'ら', katakana: 'ラ', romaji: 'ra' },
      { id: 'ri', hiragana: 'り', katakana: 'リ', romaji: 'ri' },
      { id: 'ru', hiragana: 'る', katakana: 'ル', romaji: 'ru' },
      { id: 're', hiragana: 'れ', katakana: 'レ', romaji: 're' },
      { id: 'ro', hiragana: 'ろ', katakana: 'ロ', romaji: 'ro' },
    ],
  },
  {
    id: 'wa',
    section: 'basic',
    sounds: [
      { id: 'wa', hiragana: 'わ', katakana: 'ワ', romaji: 'wa' },
      null,
      null,
      null,
      {
        id: 'wo',
        alternatives: ['o'],
        hiragana: 'を',
        katakana: 'ヲ',
        romaji: 'wo',
      },
    ],
  },
  {
    id: 'n',
    section: 'basic',
    sounds: [
      {
        id: 'n',
        alternatives: ['nn', "n'"],
        hiragana: 'ん',
        katakana: 'ン',
        romaji: 'n',
      },
      null,
      null,
      null,
      null,
    ],
  },
  {
    id: 'ga',
    section: 'dakuten',
    sounds: [
      { id: 'ga', hiragana: 'が', katakana: 'ガ', romaji: 'ga' },
      { id: 'gi', hiragana: 'ぎ', katakana: 'ギ', romaji: 'gi' },
      { id: 'gu', hiragana: 'ぐ', katakana: 'グ', romaji: 'gu' },
      { id: 'ge', hiragana: 'げ', katakana: 'ゲ', romaji: 'ge' },
      { id: 'go', hiragana: 'ご', katakana: 'ゴ', romaji: 'go' },
    ],
  },
  {
    id: 'za',
    section: 'dakuten',
    sounds: [
      { id: 'za', hiragana: 'ざ', katakana: 'ザ', romaji: 'za' },
      {
        id: 'zi',
        alternatives: ['zi'],
        hiragana: 'じ',
        katakana: 'ジ',
        romaji: 'ji',
      },
      { id: 'zu', hiragana: 'ず', katakana: 'ズ', romaji: 'zu' },
      { id: 'ze', hiragana: 'ぜ', katakana: 'ゼ', romaji: 'ze' },
      { id: 'zo', hiragana: 'ぞ', katakana: 'ゾ', romaji: 'zo' },
    ],
  },
  {
    id: 'da',
    section: 'dakuten',
    sounds: [
      { id: 'da', hiragana: 'だ', katakana: 'ダ', romaji: 'da' },
      {
        id: 'di',
        alternatives: ['di'],
        hiragana: 'ぢ',
        katakana: 'ヂ',
        romaji: 'ji',
      },
      {
        id: 'du',
        alternatives: ['du'],
        hiragana: 'づ',
        katakana: 'ヅ',
        romaji: 'zu',
      },
      { id: 'de', hiragana: 'で', katakana: 'デ', romaji: 'de' },
      { id: 'do', hiragana: 'ど', katakana: 'ド', romaji: 'do' },
    ],
  },
  {
    id: 'ba',
    section: 'dakuten',
    sounds: [
      { id: 'ba', hiragana: 'ば', katakana: 'バ', romaji: 'ba' },
      { id: 'bi', hiragana: 'び', katakana: 'ビ', romaji: 'bi' },
      { id: 'bu', hiragana: 'ぶ', katakana: 'ブ', romaji: 'bu' },
      { id: 'be', hiragana: 'べ', katakana: 'ベ', romaji: 'be' },
      { id: 'bo', hiragana: 'ぼ', katakana: 'ボ', romaji: 'bo' },
    ],
  },
  {
    id: 'pa',
    section: 'dakuten',
    sounds: [
      { id: 'pa', hiragana: 'ぱ', katakana: 'パ', romaji: 'pa' },
      { id: 'pi', hiragana: 'ぴ', katakana: 'ピ', romaji: 'pi' },
      { id: 'pu', hiragana: 'ぷ', katakana: 'プ', romaji: 'pu' },
      { id: 'pe', hiragana: 'ぺ', katakana: 'ペ', romaji: 'pe' },
      { id: 'po', hiragana: 'ぽ', katakana: 'ポ', romaji: 'po' },
    ],
  },
  {
    id: 'kya',
    section: 'yoon',
    sounds: [
      { id: 'kya', hiragana: 'きゃ', katakana: 'キャ', romaji: 'kya' },
      { id: 'kyu', hiragana: 'きゅ', katakana: 'キュ', romaji: 'kyu' },
      { id: 'kyo', hiragana: 'きょ', katakana: 'キョ', romaji: 'kyo' },
    ],
  },
  {
    id: 'sya',
    section: 'yoon',
    sounds: [
      {
        id: 'sya',
        alternatives: ['sya'],
        hiragana: 'しゃ',
        katakana: 'シャ',
        romaji: 'sha',
      },
      {
        id: 'syu',
        alternatives: ['syu'],
        hiragana: 'しゅ',
        katakana: 'シュ',
        romaji: 'shu',
      },
      {
        id: 'syo',
        alternatives: ['syo'],
        hiragana: 'しょ',
        katakana: 'ショ',
        romaji: 'sho',
      },
    ],
  },
  {
    id: 'tya',
    section: 'yoon',
    sounds: [
      {
        id: 'tya',
        alternatives: ['tya', 'cya'],
        hiragana: 'ちゃ',
        katakana: 'チャ',
        romaji: 'cha',
      },
      {
        id: 'tyu',
        alternatives: ['tyu', 'cyu'],
        hiragana: 'ちゅ',
        katakana: 'チュ',
        romaji: 'chu',
      },
      {
        id: 'tyo',
        alternatives: ['tyo', 'cyo'],
        hiragana: 'ちょ',
        katakana: 'チョ',
        romaji: 'cho',
      },
    ],
  },
  {
    id: 'nya',
    section: 'yoon',
    sounds: [
      { id: 'nya', hiragana: 'にゃ', katakana: 'ニャ', romaji: 'nya' },
      { id: 'nyu', hiragana: 'にゅ', katakana: 'ニュ', romaji: 'nyu' },
      { id: 'nyo', hiragana: 'にょ', katakana: 'ニョ', romaji: 'nyo' },
    ],
  },
  {
    id: 'hya',
    section: 'yoon',
    sounds: [
      { id: 'hya', hiragana: 'ひゃ', katakana: 'ヒャ', romaji: 'hya' },
      { id: 'hyu', hiragana: 'ひゅ', katakana: 'ヒュ', romaji: 'hyu' },
      { id: 'hyo', hiragana: 'ひょ', katakana: 'ヒョ', romaji: 'hyo' },
    ],
  },
  {
    id: 'mya',
    section: 'yoon',
    sounds: [
      { id: 'mya', hiragana: 'みゃ', katakana: 'ミャ', romaji: 'mya' },
      { id: 'myu', hiragana: 'みゅ', katakana: 'ミュ', romaji: 'myu' },
      { id: 'myo', hiragana: 'みょ', katakana: 'ミョ', romaji: 'myo' },
    ],
  },
  {
    id: 'rya',
    section: 'yoon',
    sounds: [
      { id: 'rya', hiragana: 'りゃ', katakana: 'リャ', romaji: 'rya' },
      { id: 'ryu', hiragana: 'りゅ', katakana: 'リュ', romaji: 'ryu' },
      { id: 'ryo', hiragana: 'りょ', katakana: 'リョ', romaji: 'ryo' },
    ],
  },
  {
    id: 'gya',
    section: 'yoon',
    sounds: [
      { id: 'gya', hiragana: 'ぎゃ', katakana: 'ギャ', romaji: 'gya' },
      { id: 'gyu', hiragana: 'ぎゅ', katakana: 'ギュ', romaji: 'gyu' },
      { id: 'gyo', hiragana: 'ぎょ', katakana: 'ギョ', romaji: 'gyo' },
    ],
  },
  {
    id: 'zya',
    section: 'yoon',
    sounds: [
      {
        id: 'zya',
        alternatives: ['zya', 'jya'],
        hiragana: 'じゃ',
        katakana: 'ジャ',
        romaji: 'ja',
      },
      {
        id: 'zyu',
        alternatives: ['zyu', 'jyu'],
        hiragana: 'じゅ',
        katakana: 'ジュ',
        romaji: 'ju',
      },
      {
        id: 'zyo',
        alternatives: ['zyo', 'jyo'],
        hiragana: 'じょ',
        katakana: 'ジョ',
        romaji: 'jo',
      },
    ],
  },
  {
    id: 'bya',
    section: 'yoon',
    sounds: [
      { id: 'bya', hiragana: 'びゃ', katakana: 'ビャ', romaji: 'bya' },
      { id: 'byu', hiragana: 'びゅ', katakana: 'ビュ', romaji: 'byu' },
      { id: 'byo', hiragana: 'びょ', katakana: 'ビョ', romaji: 'byo' },
    ],
  },
  {
    id: 'pya',
    section: 'yoon',
    sounds: [
      { id: 'pya', hiragana: 'ぴゃ', katakana: 'ピャ', romaji: 'pya' },
      { id: 'pyu', hiragana: 'ぴゅ', katakana: 'ピュ', romaji: 'pyu' },
      { id: 'pyo', hiragana: 'ぴょ', katakana: 'ピョ', romaji: 'pyo' },
    ],
  },
];
