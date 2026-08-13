<template>
  <div class="profile-page">
    <el-row :gutter="16">
      <!-- 左侧：用户信息概览 -->
      <el-col :xs="24" :sm="8">
        <el-card class="overview" shadow="hover">
          <div class="avatar-wrap" @click="triggerPick" v-permission="'profile:edit'">
            <el-avatar :size="72" :src="userStore.avatar">{{ initial }}</el-avatar>
            <div class="avatar-tip">点击更换头像</div>
            <!-- 原生隐藏 file input，比 el-upload(v-show:false) 更可靠 -->
            <input ref="fileInputRef" type="file" accept="image/*" class="hidden-file-input" @change="onPick" />
          </div>
          <h3 class="uname">{{ userInfo?.username }}</h3>
          <p class="nickname">{{ userInfo?.nickname || '-' }}</p>
          <div class="role-tags">
            <el-tag
              v-for="r in roles"
              :key="r"
              :type="r === 'admin' ? 'danger' : 'info'"
              size="small"
            >
              {{ roleLabel(r) }}
            </el-tag>
          </div>
          <el-divider />
          <div class="perm-block">
            <div class="perm-title">当前权限</div>
            <div class="perm-tags">
              <el-tag v-if="isAdmin" type="warning" size="small">全部权限</el-tag>
              <template v-else>
                <el-tag v-for="p in visiblePerms" :key="p" size="small" effect="plain">{{ translatePerm(p) }}</el-tag>
                <el-tag v-if="hiddenPermCount > 0" size="small" type="info">+{{ hiddenPermCount }}</el-tag>
              </template>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：基本资料 / 安全设置 -->
      <el-col :xs="24" :sm="16">
        <el-card shadow="never">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="基本资料" name="base">
              <el-form
                :model="baseForm"
                :rules="baseRules"
                ref="baseFormRef"
                label-width="90px"
                class="profile-form"
              >
                <el-form-item label="用户名" prop="username">
                  <el-input v-model="baseForm.username" disabled />
                </el-form-item>
                <el-form-item label="昵称" prop="nickname">
                  <el-input v-model="baseForm.nickname" placeholder="请输入昵称" maxlength="20" />
                </el-form-item>
                <el-form-item label="邮箱" prop="email">
                  <el-input v-model="baseForm.email" placeholder="请输入邮箱" />
                </el-form-item>
                <el-form-item label="手机号" prop="phone">
                  <el-input v-model="baseForm.phone" placeholder="请输入手机号" maxlength="11" />
                </el-form-item>
                <el-form-item label="部门">
                  <el-input :model-value="userInfo?.dept || '-'" disabled />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :loading="savingBase" @click="saveBase" v-permission="'profile:edit'">保存修改</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="安全设置" name="security">
              <el-form
                :model="pwdForm"
                :rules="pwdRules"
                ref="pwdFormRef"
                label-width="90px"
                class="profile-form"
              >
                <el-form-item label="原密码" prop="oldPassword">
                  <el-input
                    v-model="pwdForm.oldPassword"
                    type="password"
                    show-password
                    placeholder="请输入原密码"
                  />
                </el-form-item>
                <el-form-item label="新密码" prop="newPassword">
                  <el-input
                    v-model="pwdForm.newPassword"
                    type="password"
                    show-password
                    placeholder="至少 6 位"
                  />
                </el-form-item>
                <el-form-item label="确认密码" prop="confirmPassword">
                  <el-input
                    v-model="pwdForm.confirmPassword"
                    type="password"
                    show-password
                    placeholder="再次输入新密码"
                  />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :loading="savingPwd" @click="savePwd">修改密码</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>

    <!-- 头像裁剪弹窗 -->
    <el-dialog
      v-model="cropperVisible"
      title="裁剪头像"
      width="560px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      @opened="initCropper"
      @closed="destroyCropper"
      class="avatar-cropper-dialog"
    >
      <div class="cropper-stage">
        <img v-if="cropperSrc" ref="cropperImgRef" :src="cropperSrc" class="cropper-img" alt="" @load="onImgLoad" />
      </div>
      <template #footer>
        <el-button @click="cropperVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!cropperReady" @click="confirmCrop">确认裁剪</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/store/user'
import { updateProfile, changePassword } from '@/api/user'
import { usePermLabel } from '@/utils/permLabel'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

const { t } = useI18n()
const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)

// 权限码 -> 中文标签（与角色管理页共用）：个人中心「当前权限」tag 不再显示原始权限码
const { ensurePermLabels, translatePerm } = usePermLabel()
onMounted(ensurePermLabels)

const initial = computed(() => (userInfo.value?.username?.charAt(0) || 'U').toUpperCase())
const roles = computed(() => userInfo.value?.roles || [])
const isAdmin = computed(() => (userInfo.value?.permissions || []).includes('*'))
const perms = computed(() => {
  const p = userInfo.value?.permissions || []
  return p.includes('*') ? [] : p
})
const visiblePerms = computed(() => perms.value.slice(0, 8))
const hiddenPermCount = computed(() => Math.max(0, perms.value.length - 8))

function roleLabel(r: string) {
  if (r === 'admin') return t('common.roleAdmin')
  if (r === 'user') return t('common.roleUser')
  return r
}

const activeTab = ref('base')

// ---- 基本资料 ----
const baseFormRef = ref<FormInstance>()
const baseForm = reactive({ username: '', nickname: '', email: '', phone: '' })
const savingBase = ref(false)

function syncBaseForm() {
  baseForm.username = userInfo.value?.username || ''
  baseForm.nickname = userInfo.value?.nickname || ''
  baseForm.email = userInfo.value?.email || ''
  baseForm.phone = userInfo.value?.phone || ''
}
syncBaseForm()
watch(userInfo, syncBaseForm)

const baseRules: FormRules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
}

async function saveBase() {
  if (!baseFormRef.value) return
  await baseFormRef.value.validate(async (valid) => {
    if (!valid) return
    savingBase.value = true
    try {
      const updated = await updateProfile({
        nickname: baseForm.nickname,
        email: baseForm.email,
        phone: baseForm.phone,
      })
      userStore.userInfo = updated
      ElMessage.success('资料已保存')
    } finally {
      savingBase.value = false
    }
  })
}

// ---- 修改密码 ----
const pwdFormRef = ref<FormInstance>()
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const savingPwd = ref(false)

const pwdRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (_rule, value, cb) => {
        if (value !== pwdForm.newPassword) cb(new Error('两次输入的密码不一致'))
        else cb()
      },
      trigger: 'blur',
    },
  ],
}

async function savePwd() {
  if (!pwdFormRef.value) return
  await pwdFormRef.value.validate(async (valid) => {
    if (!valid) return
    savingPwd.value = true
    try {
      await changePassword({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword })
      ElMessage.success('密码修改成功')
      pwdForm.oldPassword = ''
      pwdForm.newPassword = ''
      pwdForm.confirmPassword = ''
    } finally {
      savingPwd.value = false
    }
  })
}

// ---- 头像裁剪 ----
const fileInputRef = ref<HTMLInputElement>()
const cropperVisible = ref(false)
const cropperSrc = ref('')
const cropperImgRef = ref<HTMLImageElement | null>(null)
const cropperReady = ref(false)
// 用 unknown 兼容不同版本的 cropperjs 类型导出
let cropperInstance: { getCroppedCanvas: (o?: object) => { toDataURL: (t?: string) => string }; destroy: () => void; replace: (u: string) => void } | null = null

function triggerPick() {
  fileInputRef.value?.click()
}

function onPick(e: Event) {
  const inp = e.target as HTMLInputElement
  const f = inp.files?.[0]
  // 清空 value，否则同一文件再次选择不会触发 change
  inp.value = ''
  if (!f) return
  if (!f.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  if (f.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 5MB')
    return
  }
  // 用 blob URL 同步设置 src，避免 FileReader 异步 + v-if 时序问题
  cropperSrc.value = URL.createObjectURL(f)
  cropperVisible.value = true
}

// img 加载完成后，若 dialog 已 opened 但 cropper 还没 ready，补一次 init
function onImgLoad() {
  if (cropperVisible.value && !cropperReady.value && cropperImgRef.value && !cropperInstance) {
    initCropper()
  }
}

// dialog 打开后初始化 cropper：等 img ref 真正挂到 DOM 并加载完成
async function initCropper() {
  // v-if + dialog 动画时序：ref 可能要等几帧才拿到 img
  let img = cropperImgRef.value
  for (let i = 0; i < 30 && !img; i++) {
    await new Promise((r) => setTimeout(r, 50))
    img = cropperImgRef.value
  }
  if (!img) {
    console.warn('[profile] cropper img ref not found after wait')
    return
  }
  // 等待图片解码完成（blob URL 也需要等一帧）
  if (!img.complete || img.naturalWidth === 0) {
    await new Promise<void>((resolve) => {
      img!.onload = () => resolve()
    })
  }
  // 先销毁旧实例，但绝不动 cropperSrc（清掉会导致 v-if=false 把 img 摘掉，
  // 此时 new Cropper 会因 img.parentNode=null 而 insertBefore 报错）
  if (cropperInstance) {
    cropperInstance.destroy()
    cropperInstance = null
  }
  cropperInstance = new Cropper(img, {
    aspectRatio: 1,
    viewMode: 1,
    autoCropArea: 0.9,
    background: false,
    movable: true,
    zoomable: true,
    rotatable: true,
    scalable: false,
    responsive: true,
    ready() {
      cropperReady.value = true
    },
  }) as unknown as typeof cropperInstance
}

function destroyCropper() {
  cropperInstance?.destroy()
  cropperInstance = null
  cropperReady.value = false
  // 释放 blob URL（避免内存泄漏）
  if (cropperSrc.value && cropperSrc.value.startsWith('blob:')) {
    URL.revokeObjectURL(cropperSrc.value)
  }
  cropperSrc.value = ''
}

function confirmCrop() {
  if (!cropperInstance) return
  const canvas = cropperInstance.getCroppedCanvas({ width: 256, height: 256, imageSmoothingQuality: 'high' })
  if (!canvas) {
    ElMessage.error('裁剪失败，请重试')
    return
  }
  const dataUrl = canvas.toDataURL('image/png')
  userStore.setAvatar(dataUrl)
  ElMessage.success('头像已更新')
  cropperVisible.value = false
}
</script>

<style scoped>
.profile-page {
  padding: 4px;
}
.overview {
  text-align: center;
}
.avatar-wrap {
  margin-bottom: 12px;
}
.uname {
  margin: 0 0 4px;
  font-size: 18px;
}
.nickname {
  margin: 0 0 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.role-tags {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}
.perm-block {
  text-align: left;
}
.perm-title {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}
.perm-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.profile-form {
  max-width: 460px;
  margin-top: 8px;
}
.avatar-wrap {
  margin-bottom: 12px;
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}
.avatar-tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  opacity: 0;
  transition: opacity 0.15s;
}
.avatar-wrap:hover .avatar-tip {
  opacity: 1;
}
.cropper-stage {
  height: 360px;
  background: #f5f7fa;
  border-radius: 6px;
  overflow: hidden;
}
.cropper-stage .cropper-img {
  display: block;
  max-width: 100%;
  max-height: 100%;
}
.avatar-cropper-dialog :deep(.el-dialog__body) {
  padding: 12px 16px;
}
.hidden-file-input {
  display: none;
}
</style>
