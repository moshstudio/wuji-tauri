<template>
  <div>
    <h1>Dynamic Class Inheritance Example</h1>
    <button @click="executeCode">Execute Code</button>
    <pre>{{ result }}</pre>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import CryptoJS from 'crypto-js';
import { nanoid } from 'nanoid';
class ParentClass {
  constructor() {}
  parentMethod() {
    return 'This is a parent method.';
  }
}

export default defineComponent({
  name: 'DynamicClassInheritance',
  setup() {
    const code = `
      class ChildClass extends ParentClass {
        constructor() {
          super();
          this.id = nanoid();
        }

        childMethod() {
          return 'This is the child method.';
        }
      }
      return ChildClass;
    `;

    let ChildClass: any;
    try {
      const func = new Function('ParentClass', 'CryptoJS', 'nanoid', code);
      ChildClass = func(ParentClass, CryptoJS, nanoid);
    } catch (error) {
      console.error('Error executing code:', error);
    }

    let result = ref('');

    if (ChildClass) {
      const instance = new ChildClass();
      result.value = JSON.stringify(
        {
          parentMethod: instance.parentMethod(),
          childMethod: instance.childMethod(),
          id: instance.id,
        },
        null,
        2
      );
    } else {
      result.value = 'Failed to execute code.';
    }

    return {
      result,
    };
  },
});
</script>

<style scoped>
button {
  padding: 10px 20px;
  margin-bottom: 10px;
}

pre {
  background-color: #f4f4f4;
  padding: 10px;
  border: 1px solid #ddd;
}
</style>
