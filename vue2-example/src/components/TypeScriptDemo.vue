<template>
  <div class="ts-demo">
    <h3>{{ user.name }}</h3>
    <p>{{ user.email }}</p>
    <button :class="`btn-${buttonType}`" @click="handleSelect">
      Select User
    </button>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

/**
 * User interface definition
 */
interface User {
  id: number;
  name: string;
  email: string;
}

/**
 * Button type union
 */
type ButtonType = 'primary' | 'secondary' | 'danger';

/**
 * TypeScript Demo Component
 * Demonstrates TypeScript type extraction in Vue 2
 * @displayName TypeScriptDemo
 * @since 1.0.0
 */
export default Vue.extend({
  name: 'TypeScriptDemo',
  props: {
    /**
     * User object with id, name and email
     */
    user: {
      type: Object as PropType<User>,
      required: true,
    },
    /**
     * Button type for styling
     */
    buttonType: {
      type: String as PropType<ButtonType>,
      default: 'primary',
    },
    /**
     * List of users
     */
    users: {
      type: Array as PropType<User[]>,
      default: () => [],
    },
    /**
     * Callback when user is selected
     */
    onSelect: {
      type: Function as PropType<(user: User) => void>,
    },
  },
  methods: {
    handleSelect() {
      if (this.onSelect) {
        this.onSelect(this.user);
      }
      /**
       * User selected event
       * @event select
       * @param {User} user - Selected user object
       */
      this.$emit('select', this.user);
    },
  },
});
</script>

<style scoped>
.ts-demo {
  padding: 16px;
  border: 1px solid #eee;
  border-radius: 8px;
}
.btn-primary {
  background: #1890ff;
  color: white;
}
.btn-secondary {
  background: #f0f0f0;
  color: #333;
}
.btn-danger {
  background: #ff4d4f;
  color: white;
}
</style>
