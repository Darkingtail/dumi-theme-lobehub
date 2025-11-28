<template>
  <el-card class="login-form-card">
    <div slot="header">
      <span>SFC + script setup Demo - Login Form</span>
    </div>
    <el-form
      ref="loginFormRef"
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

<script setup lang="ts">
import {
  Button as ElButton,
  Card as ElCard,
  Form as ElForm,
  FormItem as ElFormItem,
  Input as ElInput,
  Option as ElOption,
  Select as ElSelect,
  Message,
} from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import { reactive, ref } from 'vue';

interface FormData {
  username: string;
  password: string;
  region: string;
}

const loginFormRef = ref<any>(null);
const loading = ref<boolean>(false);

const formData = reactive<FormData>({
  username: '',
  password: '',
  region: '',
});

const rules = {
  username: [
    { required: true, message: 'Please enter username', trigger: 'blur' },
    { min: 3, max: 20, message: 'Length should be 3 to 20 characters', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Please enter password', trigger: 'blur' },
    { min: 6, message: 'Password should be at least 6 characters', trigger: 'blur' },
  ],
  region: [{ required: true, message: 'Please select region', trigger: 'change' }],
};

const handleSubmit = (): void => {
  loginFormRef.value?.validate((valid: boolean) => {
    if (valid) {
      loading.value = true;
      setTimeout(() => {
        loading.value = false;
        Message.success(`Login successful! Welcome, ${formData.username} from ${formData.region}`);
      }, 1000);
    } else {
      Message.error('Please check the form fields');
      return false;
    }
  });
};

const handleReset = (): void => {
  loginFormRef.value?.resetFields();
};
</script>

<style scoped lang="scss">
.login-form-card {
  max-width: 600px;
  margin: 20px 0;
  .el-form-item {
    border: 1px solid #951c1c;
    margin-bottom: 16px;
  }
}
</style>
