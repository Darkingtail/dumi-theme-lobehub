import { Button, Card, Form, FormItem, Input, Message, Option, Select } from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import { defineComponent, reactive, ref } from 'vue';

interface FormData {
  password: string;
  region: string;
  username: string;
}

export default defineComponent({
  name: 'LoginFormJSX',
  setup() {
    const loginFormRef = ref<any>(null);
    const loading = ref(false);

    const formData = reactive<FormData>({
      password: '',
      region: '',
      username: '',
    });

    const rules = {
      password: [
        { message: 'Please enter password', required: true, trigger: 'blur' },
        { message: 'Password should be at least 6 characters', min: 6, trigger: 'blur' },
      ],
      region: [{ message: 'Please select region', required: true, trigger: 'change' }],
      username: [
        { message: 'Please enter username', required: true, trigger: 'blur' },
        { max: 20, message: 'Length should be 3 to 20 characters', min: 3, trigger: 'blur' },
      ],
    };

    const regionOptions = [
      { label: 'Beijing', value: 'beijing' },
      { label: 'Shanghai', value: 'shanghai' },
      { label: 'Guangzhou', value: 'guangzhou' },
    ];

    const handleSubmit = () => {
      loginFormRef.value?.validate((valid: boolean) => {
        if (valid) {
          loading.value = true;
          setTimeout(() => {
            loading.value = false;
            Message.success(
              `Login successful! Welcome, ${formData.username} from ${formData.region}`,
            );
          }, 1000);
        } else {
          Message.error('Please check the form fields');
          return false;
        }
      });
    };

    const handleReset = () => {
      loginFormRef.value?.resetFields();
    };

    // Define input handlers to avoid JSX inline function issues
    const handleUsernameInput = (val: string) => {
      formData.username = val;
    };
    const handlePasswordInput = (val: string) => {
      formData.password = val;
    };
    const handleRegionInput = (val: string) => {
      formData.region = val;
    };

    return () => (
      <Card class="login-form-jsx">
        <div slot="header">
          <span>JSX Demo - Login Form</span>
        </div>
        <Form
          labelPosition="left"
          labelWidth="80px"
          props={{ model: formData, rules: rules }}
          ref={loginFormRef}
        >
          <FormItem label="Username" prop="username">
            <Input
              on={{ input: handleUsernameInput }}
              props={{
                placeholder: 'Please enter username',
                prefixIcon: 'el-icon-user',
                value: formData.username,
              }}
            />
          </FormItem>

          <FormItem label="Password" prop="password">
            <Input
              on={{ input: handlePasswordInput }}
              props={{
                placeholder: 'Please enter password',
                prefixIcon: 'el-icon-lock',
                showPassword: true,
                type: 'password',
                value: formData.password,
              }}
            />
          </FormItem>

          <FormItem label="Region" prop="region">
            <Select
              on={{ input: handleRegionInput }}
              props={{
                placeholder: 'Please select region',
                value: formData.region,
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
              on={{ click: handleSubmit }}
              props={{ loading: loading.value, type: 'primary' }}
            >
              Login
            </Button>
            <Button on={{ click: handleReset }}>Reset</Button>
          </FormItem>
        </Form>

        <style>
          {`
            .login-form-jsx {
              max-width: 400px;
              margin: 20px 0;
            }
          `}
        </style>
      </Card>
    );
  },
});
