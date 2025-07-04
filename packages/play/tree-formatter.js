const {FolderSize} = require('get-folder');
const {TreeFormatter, NodeFormatters} = require('get-folder');

async function demo() {
  console.log('=== TreeFormatter 新设计演示 ===\n');

  const testPath = 'D:\\developer\\GitProjects\\get-folder\\packages\\play';
  
  try {
    // 获取普通树和懒加载树用于演示
    const treeResult = await FolderSize.getTree(testPath, { maxDepth: 2 });
    const lazyTreeResult = await FolderSize.getLazyTree(testPath, { initialDepth: 1 });
    
    console.log('1. 默认格式化器（纯文本）:');
    console.log(TreeFormatter.formatTree(treeResult.tree));
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('2. 使用预设的图标格式化器:');
    console.log(TreeFormatter.formatTree(treeResult.tree, {
      nodeFormatter: NodeFormatters.withIcons()
    }));
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('3. 使用预设的大小格式化器:');
    console.log(TreeFormatter.formatTree(treeResult.tree, {
      nodeFormatter: NodeFormatters.withSize()
    }));
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('4. 使用预设的图标+大小格式化器:');
    console.log(TreeFormatter.formatTree(treeResult.tree, {
      nodeFormatter: [NodeFormatters.withIcons(), NodeFormatters.withSize()]
    }));
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('5. 懒加载树使用懒加载状态格式化器:');
    console.log(TreeFormatter.formatTree(lazyTreeResult.tree, {
      nodeFormatter: NodeFormatters.withLazyStatus()
    }));
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('6. 自定义图标:');
    console.log(TreeFormatter.formatTree(treeResult.tree, {
      nodeFormatter: NodeFormatters.withIcons({
        directory: '🗂️',
        file: '📝',
        link: '🔗'
      })
    }));
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('7. 自定义连接符:');
    console.log(TreeFormatter.formatTree(treeResult.tree, {
      nodeFormatter: NodeFormatters.withIcons(),
      connectors: {
        branch: '┣━━ ',
        lastBranch: '┗━━ ', 
        vertical: '┃   ',
        space: '    '
      }
    }));
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('8. 完全自定义的格式化器:');
    const customFormatter = (node) => {
      let content = `[${node.type.toUpperCase()}] ${node.name}`;
      
      if (node.size) {
        // 自定义大小显示格式
        const sizeKB = Math.round(Number(node.size) / 1024);
        content += ` <${sizeKB}KB>`;
      }
      
      if (node.type === 'directory') {
        const childCount = node.children ? node.children.length : 0;
        content += ` {${childCount} items}`;
      }
      
      return content;
    };
    
    console.log(TreeFormatter.formatTree(treeResult.tree, {
      nodeFormatter: customFormatter
    }));
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('9. 深度限制演示:');
    console.log(TreeFormatter.formatTree(treeResult.tree, {
      nodeFormatter: NodeFormatters.withIcons(),
      maxDisplayDepth: 1
    }));
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('10. 懒加载树完整格式化器:');
    console.log(TreeFormatter.formatTree(lazyTreeResult.tree, {
      nodeFormatter: NodeFormatters.fullFormatter({
        icons: {
          directory: '📂',
          file: '📋',
          link: '🔗'
        },
        statusIcons: {
          loaded: '✅',
          unloaded: '⏳',
          empty: '🗂️'
        }
      })
    }));
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('11. 组合多个自定义回调:');
    const pathFormatter = (node) => {
      // 显示相对路径的最后两部分
      const pathParts = node.path.split(/[/\\]/);
      const shortPath = pathParts.slice(-2).join('/');
      return `${node.name} (${shortPath})`;
    };
    
    console.log(TreeFormatter.formatTree(treeResult.tree, {
      nodeFormatter: pathFormatter,
      maxDisplayDepth: 1
    }));
    
    console.log('\n' + '='.repeat(50) + '\n');

    // 统计信息演示
    console.log('12. 统计信息:');
    const treeStats = TreeFormatter.getTreeStats(treeResult.tree);
    console.log('普通树统计:', treeStats);
    
    const lazyStats = TreeFormatter.getLazyTreeStats(lazyTreeResult.tree);
    console.log('懒加载树统计:', lazyStats);

  } catch (error) {
    console.error('演示失败:', error.message);
  }
}

demo(); 