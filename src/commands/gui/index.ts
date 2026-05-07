import type { Command } from '../../types/command.js'

const gui = {
  type: 'local-jsx',
  name: 'gui',
  description: 'Start the Latte GUI web interface',
  descriptionZh: '启动 Latte GUI 网页界面',
  aliases: ['web'],
  load: () => import('./gui.js'),
} satisfies Command

export default gui
