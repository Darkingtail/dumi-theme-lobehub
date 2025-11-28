/**
 * TSX Demo using Vue.extend (Options API)
 * This tests the Vue.extend fix for live editing
 */
/* eslint-disable react/no-string-refs */
import { Button, Card, Form, FormItem, Input, Message, Option, Select } from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import Vue from 'vue';

interface FormData {
  password: string;
  region: string;
  username: string;
}

interface RuleItem {
  max?: number;
  message: string;
  min?: number;
  required?: boolean;
  trigger: string;
}

interface Rules {
  password: RuleItem[];
  region: RuleItem[];
  username: RuleItem[];
}

export default Vue.extend({
  data(): { formData: FormData; loading: boolean; rules: Rules } {
    return {
      formData: {
        password: '',
        region: '',
        username: '',
      },
      loading: false,
      rules: {
        password: [
          { message: 'Please enter password', required: true, trigger: 'blur' },
          { message: 'Password should be at least 6 characters', min: 6, trigger: 'blur' },
        ],
        region: [{ message: 'Please select region', required: true, trigger: 'change' }],
        username: [
          { message: 'Please enter username', required: true, trigger: 'blur' },
          { max: 20, message: 'Length should be 3 to 20 characters', min: 3, trigger: 'blur' },
        ],
      },
    };
  },
  methods: {
    handlePasswordInput(val: string): void {
      this.formData.password = val;
    },
    handleRegionInput(val: string): void {
      this.formData.region = val;
    },
    handleReset(): void {
      const form = this.$refs.loginForm as any;
      form.resetFields();
    },
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
    handleUsernameInput(val: string): void {
      this.formData.username = val;
    },
  },
  name: 'LoginFormExtend',
  render() {
    const regionOptions = [
      { label: 'Beijing', value: 'beijing' },
      { label: 'Shanghai', value: 'shanghai' },
      { label: 'Guangzhou', value: 'guangzhou' },
    ];

    return (
      <Card class="login-form-extend">
        <div slot="header">
          <span>TSX Demo - Vue.extend (Options API)</span>
        </div>
        <Form
          labelPosition="left"
          labelWidth="80px"
          props={{ model: this.formData, rules: this.rules }}
          ref="loginForm"
        >
          <FormItem label="Username" prop="username">
            <Input
              on={{ input: this.handleUsernameInput }}
              placeholder="Please enter username"
              props={{
                prefixIcon: 'el-icon-user',
                value: this.formData.username,
              }}
            />
          </FormItem>

          <FormItem label="Password" prop="password">
            <Input
              on={{ input: this.handlePasswordInput }}
              placeholder="Please enter password"
              props={{
                prefixIcon: 'el-icon-lock',
                showPassword: true,
                type: 'password',
                value: this.formData.password,
              }}
            />
          </FormItem>

          <FormItem label="Region" prop="region">
            <Select
              on={{ input: this.handleRegionInput }}
              props={{
                placeholder: 'Please select region',
                value: this.formData.region,
              }}
              style={{ width: '100%' }}
            >
              {regionOptions.map((opt) => (
                <Option key={opt.value} props={{ label: opt.label, value: opt.value }} />
              ))}
            </Select>
          </FormItem>

          <FormItem>
            <Button
              on={{ click: this.handleSubmit }}
              props={{ loading: this.loading, type: 'primary' }}
            >
              Login
            </Button>
            <Button on-click={this.handleReset}>Reset</Button>
          </FormItem>
        </Form>

        <style>
          {`
            .login-form-extend {
              max-width: 550px;
              margin: 20px 0;
            }
          `}
        </style>
      </Card>
    );
  },
});
