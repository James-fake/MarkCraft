/**
 * 表情头像数据源（macOS 新用户头像选择器的灵感来源）
 *
 * 设计取舍：
 * - 纯静态数据、零依赖，不引 emoji-mart 之类的重型库（离线桌面应用，包体与启动都要克制）；
 * - 每个表情带中/英关键词，供搜索框模糊匹配，中英文用户都能「打得出想要的那个」；
 * - 分组只用于顶部快捷筛选，数据本身按组排列，保证「全部」视图有自然的视觉节奏；
 * - 全部为系统字体可直接渲染的通用 emoji，不依赖图片资源与网络。
 */

export type AvatarEmojiGroup =
  | 'smileys' | 'people' | 'animals' | 'nature'
  | 'food' | 'activity' | 'objects' | 'symbols'

export interface AvatarEmojiGroupMeta {
  id: AvatarEmojiGroup
  /** 分组按钮上的代表表情 */
  icon: string
  zh: string
  en: string
}

export const AVATAR_EMOJI_GROUPS: AvatarEmojiGroupMeta[] = [
  { id: 'smileys', icon: '😀', zh: '笑脸', en: 'Smileys' },
  { id: 'people', icon: '👋', zh: '人物', en: 'People' },
  { id: 'animals', icon: '🐱', zh: '动物', en: 'Animals' },
  { id: 'nature', icon: '🌿', zh: '自然', en: 'Nature' },
  { id: 'food', icon: '🍎', zh: '食物', en: 'Food' },
  { id: 'activity', icon: '🎨', zh: '爱好', en: 'Hobbies' },
  { id: 'objects', icon: '📚', zh: '物品', en: 'Objects' },
  { id: 'symbols', icon: '✨', zh: '符号', en: 'Symbols' },
]

export interface AvatarEmoji {
  char: string
  group: AvatarEmojiGroup
  /** 中文名称 + 常见联想词，空格分隔 */
  zh: string
  /** 英文名称 + 常见联想词，空格分隔（小写） */
  en: string
}

export const AVATAR_EMOJIS: AvatarEmoji[] = [
  // —— 笑脸 ——
  { char: '😀', group: 'smileys', zh: '笑脸 开心 大笑', en: 'grin happy smile' },
  { char: '😃', group: 'smileys', zh: '开心 大笑', en: 'smiley happy' },
  { char: '😄', group: 'smileys', zh: '开心 笑', en: 'happy laugh' },
  { char: '😁', group: 'smileys', zh: '咧嘴 得意', en: 'beam grin' },
  { char: '😆', group: 'smileys', zh: '大笑 哈哈', en: 'laugh haha' },
  { char: '😊', group: 'smileys', zh: '微笑 害羞 温柔', en: 'blush smile shy' },
  { char: '🙂', group: 'smileys', zh: '微笑 淡淡', en: 'slight smile' },
  { char: '😉', group: 'smileys', zh: '眨眼 俏皮', en: 'wink' },
  { char: '😍', group: 'smileys', zh: '喜欢 心动 星星眼', en: 'heart eyes love' },
  { char: '🥰', group: 'smileys', zh: '喜爱 幸福', en: 'smiling hearts love' },
  { char: '😘', group: 'smileys', zh: '飞吻 亲亲', en: 'kiss' },
  { char: '😎', group: 'smileys', zh: '酷 墨镜', en: 'cool sunglasses' },
  { char: '🤓', group: 'smileys', zh: '书呆 学霸 眼镜', en: 'nerd geek' },
  { char: '🤔', group: 'smileys', zh: '思考 琢磨', en: 'thinking hmm' },
  { char: '🤗', group: 'smileys', zh: '拥抱 温暖', en: 'hug' },
  { char: '😌', group: 'smileys', zh: '安心 放松', en: 'relieved calm' },
  { char: '😴', group: 'smileys', zh: '睡觉 困', en: 'sleeping tired' },
  { char: '🤠', group: 'smileys', zh: '牛仔 帽子', en: 'cowboy' },
  { char: '🥳', group: 'smileys', zh: '庆祝 派对', en: 'party celebrate' },
  { char: '😇', group: 'smileys', zh: '天使 乖', en: 'angel innocent' },
  { char: '🤩', group: 'smileys', zh: '惊艳 星星眼', en: 'star struck wow' },
  { char: '😏', group: 'smileys', zh: '坏笑 得意', en: 'smirk' },
  { char: '🤯', group: 'smileys', zh: '震惊 炸裂', en: 'mind blown shock' },
  { char: '🥺', group: 'smileys', zh: '委屈 可怜', en: 'pleading puppy eyes' },

  // —— 人物 / 手势 ——
  { char: '👋', group: 'people', zh: '挥手 你好', en: 'wave hello hi' },
  { char: '👍', group: 'people', zh: '点赞 好 棒', en: 'thumbs up like good' },
  { char: '👏', group: 'people', zh: '鼓掌 掌声', en: 'clap applause' },
  { char: '🙌', group: 'people', zh: '举手 欢呼', en: 'raised hands celebrate' },
  { char: '🤝', group: 'people', zh: '握手 合作', en: 'handshake deal' },
  { char: '✌️', group: 'people', zh: '胜利 耶 比心', en: 'victory peace' },
  { char: '🤞', group: 'people', zh: '祈祷 好运', en: 'fingers crossed luck' },
  { char: '💪', group: 'people', zh: '加油 肌肉 强', en: 'muscle strong' },
  { char: '👀', group: 'people', zh: '眼睛 看看', en: 'eyes look' },
  { char: '🧠', group: 'people', zh: '大脑 聪明', en: 'brain smart' },
  { char: '🫶', group: 'people', zh: '比心 爱心', en: 'heart hands love' },
  { char: '🦸', group: 'people', zh: '超人 英雄', en: 'superhero hero' },
  { char: '🧑‍💻', group: 'people', zh: '程序员 码农 电脑', en: 'developer coder programmer' },
  { char: '🧑‍🎨', group: 'people', zh: '画家 艺术家', en: 'artist painter' },
  { char: '🕵️', group: 'people', zh: '侦探 调查', en: 'detective spy' },
  { char: '🧙', group: 'people', zh: '魔法师 巫师', en: 'wizard mage' },

  // —— 动物 ——
  { char: '🐱', group: 'animals', zh: '猫 猫咪', en: 'cat kitty' },
  { char: '🐶', group: 'animals', zh: '狗 小狗', en: 'dog puppy' },
  { char: '🐼', group: 'animals', zh: '熊猫', en: 'panda' },
  { char: '🦊', group: 'animals', zh: '狐狸', en: 'fox' },
  { char: '🐻', group: 'animals', zh: '熊', en: 'bear' },
  { char: '🐰', group: 'animals', zh: '兔子', en: 'rabbit bunny' },
  { char: '🐯', group: 'animals', zh: '老虎', en: 'tiger' },
  { char: '🦁', group: 'animals', zh: '狮子', en: 'lion' },
  { char: '🐸', group: 'animals', zh: '青蛙', en: 'frog' },
  { char: '🐵', group: 'animals', zh: '猴子', en: 'monkey' },
  { char: '🐧', group: 'animals', zh: '企鹅', en: 'penguin' },
  { char: '🦉', group: 'animals', zh: '猫头鹰 智慧', en: 'owl wise' },
  { char: '🦋', group: 'animals', zh: '蝴蝶', en: 'butterfly' },
  { char: '🐢', group: 'animals', zh: '乌龟 慢', en: 'turtle' },
  { char: '🐳', group: 'animals', zh: '鲸鱼', en: 'whale' },
  { char: '🦄', group: 'animals', zh: '独角兽 梦幻', en: 'unicorn magic' },
  { char: '🐝', group: 'animals', zh: '蜜蜂 勤奋', en: 'bee' },
  { char: '🐙', group: 'animals', zh: '章鱼', en: 'octopus' },

  // —— 自然 ——
  { char: '🌿', group: 'nature', zh: '叶子 绿植', en: 'herb leaf plant' },
  { char: '🌱', group: 'nature', zh: '嫩芽 成长', en: 'seedling growth' },
  { char: '🌸', group: 'nature', zh: '樱花 花', en: 'blossom flower' },
  { char: '🌻', group: 'nature', zh: '向日葵 阳光', en: 'sunflower' },
  { char: '🌈', group: 'nature', zh: '彩虹', en: 'rainbow' },
  { char: '☀️', group: 'nature', zh: '太阳 晴天', en: 'sun sunny' },
  { char: '🌙', group: 'nature', zh: '月亮 夜晚', en: 'moon night' },
  { char: '⭐', group: 'nature', zh: '星星 收藏', en: 'star favorite' },
  { char: '🔥', group: 'nature', zh: '火 热 燃', en: 'fire hot lit' },
  { char: '💧', group: 'nature', zh: '水滴 水', en: 'droplet water' },
  { char: '🌊', group: 'nature', zh: '海浪 海', en: 'wave ocean' },
  { char: '🍀', group: 'nature', zh: '四叶草 幸运', en: 'clover luck' },
  { char: '🌵', group: 'nature', zh: '仙人掌', en: 'cactus' },
  { char: '❄️', group: 'nature', zh: '雪花 冬天', en: 'snowflake winter' },

  // —— 食物 ——
  { char: '🍎', group: 'food', zh: '苹果 水果', en: 'apple fruit' },
  { char: '🍊', group: 'food', zh: '橘子 橙子', en: 'orange tangerine' },
  { char: '🍋', group: 'food', zh: '柠檬', en: 'lemon' },
  { char: '🍉', group: 'food', zh: '西瓜', en: 'watermelon' },
  { char: '🍓', group: 'food', zh: '草莓', en: 'strawberry' },
  { char: '🍑', group: 'food', zh: '桃子', en: 'peach' },
  { char: '🥑', group: 'food', zh: '牛油果', en: 'avocado' },
  { char: '🍕', group: 'food', zh: '披萨', en: 'pizza' },
  { char: '🍔', group: 'food', zh: '汉堡', en: 'burger' },
  { char: '🍜', group: 'food', zh: '面条 拉面', en: 'noodles ramen' },
  { char: '🍣', group: 'food', zh: '寿司', en: 'sushi' },
  { char: '☕', group: 'food', zh: '咖啡 提神', en: 'coffee' },
  { char: '🍵', group: 'food', zh: '茶 绿茶', en: 'tea' },
  { char: '🍰', group: 'food', zh: '蛋糕 甜点', en: 'cake dessert' },
  { char: '🍩', group: 'food', zh: '甜甜圈', en: 'donut' },
  { char: '🍪', group: 'food', zh: '饼干', en: 'cookie' },

  // —— 爱好 / 活动 ——
  { char: '🎨', group: 'activity', zh: '画画 艺术 调色板', en: 'art paint palette' },
  { char: '🎸', group: 'activity', zh: '吉他 音乐', en: 'guitar music' },
  { char: '🎹', group: 'activity', zh: '钢琴 键盘', en: 'piano keyboard' },
  { char: '🎧', group: 'activity', zh: '耳机 听歌', en: 'headphones music' },
  { char: '📷', group: 'activity', zh: '相机 摄影', en: 'camera photo' },
  { char: '🎬', group: 'activity', zh: '电影 拍片', en: 'movie film' },
  { char: '⚽', group: 'activity', zh: '足球 运动', en: 'soccer football sport' },
  { char: '🏀', group: 'activity', zh: '篮球', en: 'basketball' },
  { char: '🚴', group: 'activity', zh: '骑行 自行车', en: 'cycling bike' },
  { char: '🏔️', group: 'activity', zh: '登山 山', en: 'mountain hiking' },
  { char: '🎮', group: 'activity', zh: '游戏 手柄', en: 'game controller' },
  { char: '🧩', group: 'activity', zh: '拼图 思考', en: 'puzzle' },
  { char: '🎯', group: 'activity', zh: '目标 靶心', en: 'target goal' },
  { char: '🧘', group: 'activity', zh: '冥想 瑜伽 平静', en: 'meditation yoga calm' },

  // —— 物品 ——
  { char: '📚', group: 'objects', zh: '书 书本 阅读', en: 'books reading' },
  { char: '📖', group: 'objects', zh: '打开的书 阅读', en: 'open book read' },
  { char: '✏️', group: 'objects', zh: '铅笔 写作', en: 'pencil write' },
  { char: '🖊️', group: 'objects', zh: '钢笔 记录', en: 'pen write' },
  { char: '📝', group: 'objects', zh: '笔记 便签', en: 'memo note' },
  { char: '💡', group: 'objects', zh: '灯泡 点子 灵感', en: 'bulb idea inspiration' },
  { char: '💻', group: 'objects', zh: '电脑 笔记本', en: 'laptop computer' },
  { char: '🖥️', group: 'objects', zh: '显示器 台式机', en: 'desktop monitor' },
  { char: '🔍', group: 'objects', zh: '放大镜 搜索', en: 'magnifier search' },
  { char: '🔮', group: 'objects', zh: '水晶球 预言', en: 'crystal ball' },
  { char: '🗝️', group: 'objects', zh: '钥匙 解锁', en: 'key unlock' },
  { char: '🎁', group: 'objects', zh: '礼物 惊喜', en: 'gift present' },
  { char: '🚀', group: 'objects', zh: '火箭 起飞 启动', en: 'rocket launch startup' },
  { char: '⏳', group: 'objects', zh: '沙漏 时间', en: 'hourglass time' },

  // —— 符号 ——
  { char: '✨', group: 'symbols', zh: '闪光 星星 魔法', en: 'sparkles magic shiny' },
  { char: '💫', group: 'symbols', zh: '彗星 眩晕 闪', en: 'dizzy sparkle' },
  { char: '❤️', group: 'symbols', zh: '红心 爱心 爱', en: 'red heart love' },
  { char: '💜', group: 'symbols', zh: '紫心 喜欢', en: 'purple heart' },
  { char: '💛', group: 'symbols', zh: '黄心 温暖', en: 'yellow heart' },
  { char: '💚', group: 'symbols', zh: '绿心', en: 'green heart' },
  { char: '💙', group: 'symbols', zh: '蓝心', en: 'blue heart' },
  { char: '🧡', group: 'symbols', zh: '橙心', en: 'orange heart' },
  { char: '♾️', group: 'symbols', zh: '无限 无穷', en: 'infinity' },
  { char: '☯️', group: 'symbols', zh: '阴阳 平衡', en: 'yin yang balance' },
  { char: '🎵', group: 'symbols', zh: '音符 音乐', en: 'music note' },
  { char: '🔆', group: 'symbols', zh: '明亮 亮度', en: 'bright brightness' },
]

/**
 * 按关键词 / 分组过滤；空关键词 + 全部分组返回全部。
 * 中英关键词一律同时匹配，所以无需传语言 —— 中文用户打 `cat`、英文用户打「猫」都能命中。
 */
export function filterAvatarEmojis(query: string, group: AvatarEmojiGroup | 'all'): AvatarEmoji[] {
  const q = query.trim().toLowerCase()
  return AVATAR_EMOJIS.filter((item) => {
    if (group !== 'all' && item.group !== group) return false
    if (!q) return true
    return item.char.includes(q) || item.zh.toLowerCase().includes(q) || item.en.includes(q)
  })
}
