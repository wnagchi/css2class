<template>
  <div class="container mx-auto p-4">
    <!-- 头部区域 -->
    <header class="bg-primary text-white p-6 rounded-lg mb-8 shadow-md">
      <h1 class="text-3xl font-bold text-center mb-2">
        CSS Optimizer 示例页面
      </h1>
      <p class="text-center text-blue-100">
        展示各种CSS类和响应式设计
      </p>
    </header>

    <!-- 主要内容区域 -->
    <main class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <!-- 卡片组件 -->
      <div class="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">
          颜色系统
        </h2>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-gray-600">主要色</span>
            <div class="w-8 h-8 bg-primary rounded-full"></div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-600">成功色</span>
            <div class="w-8 h-8 bg-success rounded-full"></div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-600">警告色</span>
            <div class="w-8 h-8 bg-warning rounded-full"></div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-600">错误色</span>
            <div class="w-8 h-8 bg-error rounded-full"></div>
          </div>
        </div>
      </div>

      <!-- 间距系统 -->
      <div class="bg-white p-6 rounded-lg shadow-lg">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">
          间距系统
        </h2>
        <div class="space-y-4">
          <div class="bg-gray-100 p-2">
            <div class="bg-blue-200 p-1">小间距 (p-1)</div>
          </div>
          <div class="bg-gray-100 p-4">
            <div class="bg-blue-300 p-2">中等间距 (p-2)</div>
          </div>
          <div class="bg-gray-100 p-6">
            <div class="bg-blue-400 p-3">大间距 (p-3)</div>
          </div>
        </div>
      </div>

      <!-- 交互效果 -->
      <div class="bg-white p-6 rounded-lg shadow-lg">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">
          交互效果
        </h2>
        <div class="space-y-3">
          <button class="w-full bg-primary text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
            悬停效果
          </button>
          <button class="w-full bg-success text-white py-2 px-4 rounded active:bg-green-600">
            点击效果
          </button>
          <button class="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded cursor-not-allowed opacity-50" disabled>
            禁用状态
          </button>
        </div>
      </div>
    </main>

    <!-- 响应式网格 -->
    <section class="bg-gray-50 p-8 rounded-lg mb-8">
      <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">
        响应式设计
      </h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-primary text-white p-4 rounded text-center text-sm md:text-base">
          移动端
        </div>
        <div class="bg-success text-white p-4 rounded text-center text-sm md:text-base">
          平板端
        </div>
        <div class="bg-warning text-white p-4 rounded text-center text-sm md:text-base">
          桌面端
        </div>
        <div class="bg-error text-white p-4 rounded text-center text-sm md:text-base">
          大屏幕
        </div>
      </div>
    </section>

    <!-- 布局示例 -->
    <section class="bg-white p-6 rounded-lg shadow-lg mb-8">
      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        布局系统
      </h2>
      
      <!-- Flexbox 示例 -->
      <div class="mb-8">
        <h3 class="text-lg font-semibold text-gray-700 mb-4">Flexbox 布局</h3>
        <div class="flex flex-col md:flex-row items-center justify-between bg-gray-100 p-4 rounded">
          <div class="bg-primary text-white p-3 rounded mb-2 md:mb-0">左侧</div>
          <div class="bg-success text-white p-3 rounded mb-2 md:mb-0">中间</div>
          <div class="bg-warning text-white p-3 rounded">右侧</div>
        </div>
      </div>

      <!-- Grid 示例 -->
      <div>
        <h3 class="text-lg font-semibold text-gray-700 mb-4">Grid 布局</h3>
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-red-200 p-4 rounded text-center">1</div>
          <div class="bg-green-200 p-4 rounded text-center">2</div>
          <div class="bg-blue-200 p-4 rounded text-center">3</div>
          <div class="bg-yellow-200 p-4 rounded text-center">4</div>
          <div class="bg-purple-200 p-4 rounded text-center">5</div>
          <div class="bg-pink-200 p-4 rounded text-center">6</div>
        </div>
      </div>
    </section>

    <!-- 表单示例 -->
    <section class="bg-white p-6 rounded-lg shadow-lg mb-8">
      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        表单组件
      </h2>
      <form class="space-y-4 max-w-md">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            姓名
          </label>
          <input 
            type="text" 
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="请输入姓名"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            邮箱
          </label>
          <input 
            type="email" 
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="请输入邮箱"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            消息
          </label>
          <textarea 
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="请输入消息"
          ></textarea>
        </div>
        <button 
          type="submit"
          class="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          提交
        </button>
      </form>
    </section>

    <!-- 页脚 -->
    <footer class="bg-gray-800 text-white p-6 rounded-lg text-center">
      <p class="text-gray-300">
        CSS Optimizer 示例页面 - 展示各种功能和特性
      </p>
      <div class="mt-4 flex justify-center space-x-4">
        <a href="#" class="text-blue-400 hover:text-blue-300">GitHub</a>
        <a href="#" class="text-blue-400 hover:text-blue-300">文档</a>
        <a href="#" class="text-blue-400 hover:text-blue-300">支持</a>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* 组件样式 */
.card-hover:hover {
  transform: translateY(-2px);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>