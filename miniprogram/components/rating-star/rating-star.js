// components/rating-star/rating-star.js
Component({
  properties: {
    value: {
      type: Number,
      value: 0
    },
    readonly: {
      type: Boolean,
      value: false
    },
    size: {
      type: Number,
      value: 40
    }
  },

  methods: {
    onTap(e) {
      if (this.data.readonly) return;
      
      const rating = e.currentTarget.dataset.rating;
      this.triggerEvent('change', { value: rating });
    }
  }
});
