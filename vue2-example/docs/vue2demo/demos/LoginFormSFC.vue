<template>
  <el-card class="login-form-card">
    <div slot="header">
      <span>SFC Demo - Login Form (TypeScript)</span>
    </div>
    <el-form
      ref="loginForm"
      :model="formData"
      :rules="rules"
      label-width="80px"
      label-position="left"
    >
      <el-form-item label="Username" prop="username">
        <el-input
          v-model="formData.username"
          placeholder="Please enter username"
          prefix-icon="el-icon-user"
        />
      </el-form-item>

      <el-form-item label="Password" prop="password">
        <el-input
          v-model="formData.password"
          type="password"
          placeholder="Please enter password"
          prefix-icon="el-icon-lock"
          show-password
        />
      </el-form-item>

      <el-form-item label="Region" prop="region">
        <el-select v-model="formData.region" placeholder="Please select region" style="width: 100%">
          <el-option label="Beijing" value="beijing" />
          <el-option label="Shanghai" value="shanghai" />
          <el-option label="Guangzhou" value="guangzhou" />
        </el-select>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="loading" @click="handleSubmit"> Login </el-button>
        <el-button @click="handleReset">Reset</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script lang="ts">
import { Button, Card, Form, FormItem, Input, Message, Option, Select } from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import Vue from 'vue';

Vue.use(Card);
Vue.use(Form);
Vue.use(FormItem);
Vue.use(Input);
Vue.use(Select);
Vue.use(Option);
Vue.use(Button);

interface FormData {
  username: string;
  password: string;
  region: string;
}

interface RuleItem {
  required?: boolean;
  message: string;
  trigger: string;
  min?: number;
  max?: number;
}

interface Rules {
  username: RuleItem[];
  password: RuleItem[];
  region: RuleItem[];
}

export default {
  name: 'LoginFormSFC',
  data(): { loading: boolean; formData: FormData; rules: Rules } {
    return {
      loading: false,
      formData: {
        username: '',
        password: '',
        region: '',
      },
      rules: {
        username: [
          { required: true, message: 'Please enter username', trigger: 'blur' },
          { min: 3, max: 20, message: 'Length should be 3 to 20 characters', trigger: 'blur' },
        ],
        password: [
          { required: true, message: 'Please enter password', trigger: 'blur' },
          { min: 6, message: 'Password should be at least 6 characters', trigger: 'blur' },
        ],
        region: [{ required: true, message: 'Please select region', trigger: 'change' }],
      },
    };
  },
  methods: {
    handleSubmit(): void {
      const form = this.$refs.loginForm as any;
      form.validate((valid: boolean) => {
        if (valid) {
          this.loading = true;
          setTimeout(() => {
            this.loading = false;
            Message.success(
              `Login successful! Welcome, ${this.formData.username} from ${this.formData.region}`,
            );
          }, 1000);
        } else {
          Message.error('Please check the form fields');
          return false;
        }
      });
    },
    handleReset(): void {
      const form = this.$refs.loginForm as any;
      form.resetFields();
    },
  },
};
</script>

<style scoped>
.login-form-card {
  max-width: 400px;
  margin: 20px 0;
}
</style>
