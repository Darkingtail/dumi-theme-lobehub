import { Button, Card, Form, FormItem, Input, Message, Option, Select } from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import { defineComponent, h, reactive, ref } from 'vue';

interface FormData {
  password: string;
  region: string;
  username: string;
}

export default defineComponent({
  name: 'LoginFormComposition',
  render() {
    return h(Card, { class: 'login-form-card' }, [
      h('div', { slot: 'header' }, [h('span', 'Composition API Demo - Login Form')]),
      h(
        Form,
        {
          props: {
            labelPosition: 'left',
            labelWidth: '80px',
            model: this.formData,
            rules: this.rules,
          },
          ref: 'loginFormRef',
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

    return {
      formData,
      handleReset,
      handleSubmit,
      loading,
      loginFormRef,
      regionOptions,
      rules,
    };
  },
});
