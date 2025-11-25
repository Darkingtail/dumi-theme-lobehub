import { Button, Card, Form, FormItem, Input, Message, Option, Select } from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import { defineComponent, h } from 'vue';

interface FormData {
  password: string;
  region: string;
  username: string;
}

export default defineComponent({
  data() {
    return {
      formData: {
        password: '',
        region: '',
        username: '',
      } as FormData,
      loading: false,
      regionOptions: [
        { label: 'Beijing', value: 'beijing' },
        { label: 'Shanghai', value: 'shanghai' },
        { label: 'Guangzhou', value: 'guangzhou' },
      ],
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
    handleReset() {
      (this.$refs.loginForm as any).resetFields();
    },
    handleSubmit() {
      (this.$refs.loginForm as any).validate((valid: boolean) => {
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
  },
  name: 'LoginFormDefine',
  render() {
    return h(Card, { class: 'login-form-card' }, [
      h('div', { slot: 'header' }, [h('span', 'defineComponent Demo - Login Form')]),
      h(
        Form,
        {
          props: {
            labelPosition: 'left',
            labelWidth: '80px',
            model: this.formData,
            rules: this.rules,
          },
          ref: 'loginForm',
        },
        [
          h(FormItem, { props: { label: 'Username', prop: 'username' } }, [
            h(Input, {
              on: {
                input: (val: string) => {
                  this.formData.username = val;
                },
              },
              props: {
                placeholder: 'Please enter username',
                prefixIcon: 'el-icon-user',
                value: this.formData.username,
              },
            }),
          ]),
          h(FormItem, { props: { label: 'Password', prop: 'password' } }, [
            h(Input, {
              on: {
                input: (val: string) => {
                  this.formData.password = val;
                },
              },
              props: {
                placeholder: 'Please enter password',
                prefixIcon: 'el-icon-lock',
                showPassword: true,
                type: 'password',
                value: this.formData.password,
              },
            }),
          ]),
          h(FormItem, { props: { label: 'Region', prop: 'region' } }, [
            h(
              Select,
              {
                on: {
                  input: (val: string) => {
                    this.formData.region = val;
                  },
                },
                props: {
                  placeholder: 'Please select region',
                  value: this.formData.region,
                },
                style: { width: '100%' },
              },
              this.regionOptions.map((opt) =>
                h(Option, { key: opt.value, props: { label: opt.label, value: opt.value } }),
              ),
            ),
          ]),
          h(FormItem, [
            h(
              Button,
              {
                on: { click: this.handleSubmit },
                props: { loading: this.loading, type: 'primary' },
              },
              'Login',
            ),
            h(
              Button,
              {
                on: { click: this.handleReset },
              },
              'Reset',
            ),
          ]),
        ],
      ),
      h('style', `.login-form-card { max-width: 400px; margin: 20px 0; }`),
    ]);
  },
});
