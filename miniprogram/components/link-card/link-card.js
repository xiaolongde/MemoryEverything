// components/link-card/link-card.js
Component({
  properties: {
    link: {
      type: Object,
      value: {}
    }
  },

  data: {
    defaultThumbnail: '/images/default-thumbnail.png'
  },

  methods: {
    onImageError() {
      // 图片加载失败时使用默认图
    }
  }
});
