<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import {
  NButton,
  NModal,
  NProgress,
  NSpace,
  NTag,
  NTooltip,
} from 'naive-ui'
import { XBox } from 'ilx1-x-box'
import {
  cancelSoftwareUpdate,
  checkSoftwareUpdate,
  createDefaultSoftwareUpdateViewState,
  downloadSoftwareUpdate,
  formatSoftwarePackageSize,
  getSoftwareUpdateState,
  installSoftwareUpdate,
  normalizeSoftwareUpdateState,
  openSoftwareUpdatePage,
  type SoftwareUpdateViewState,
} from '@/utils/tools/softwareUpdate'

const win = window as any
const showUpdateModal = ref(false)
const updateState = reactive<SoftwareUpdateViewState>(
  createDefaultSoftwareUpdateViewState()
)
let removeSoftwareUpdateListener: (() => void) | null = null

const updateInfo = computed(() => updateState.updateInfo)
const hasUpdate = computed(() => updateState.phase == 'available')
const hasDownloaded = computed(() => updateState.phase == 'downloaded')
const canDownload = computed(() => {
  return hasUpdate.value && Boolean(updateInfo.value?.hasDirectPackage)
})
const progressText = computed(() => {
  if (!updateState.downloadedSize) return ''
  return formatSoftwarePackageSize(updateState.downloadedSize)
})

const mergeState = (state: SoftwareUpdateViewState) => {
  Object.assign(updateState, state)
}

const syncUpdateState = async () => {
  try {
    mergeState(await getSoftwareUpdateState())
  } catch (error) {
    console.error(error)
  }
}

const handleCheckUpdate = async (silent = false) => {
  showUpdateModal.value = true
  try {
    const result = await checkSoftwareUpdate()
    await syncUpdateState()
    if (!silent && !result?.success) {
      XBox.popMes(result?.message || '检查更新失败')
    }
  } catch (error) {
    console.error(error)
    XBox.popMes('检查更新失败')
  }
}

const handleDownloadUpdate = async () => {
  try {
    const result = await downloadSoftwareUpdate()
    await syncUpdateState()
    if (!result?.success) {
      XBox.popMes(result?.message || '下载更新失败')
    }
  } catch (error) {
    console.error(error)
    XBox.popMes('下载更新失败')
  }
}

const handleCancelDownload = async () => {
  try {
    await cancelSoftwareUpdate()
    await syncUpdateState()
  } catch (error) {
    console.error(error)
    XBox.popMes('取消下载失败')
  }
}

const handleInstallUpdate = async () => {
  try {
    const result = await installSoftwareUpdate()
    if (!result?.success) {
      XBox.popMes(result?.message || '启动安装失败')
    }
  } catch (error) {
    console.error(error)
    XBox.popMes('启动安装失败')
  }
}

const handleOpenPage = async () => {
  try {
    const result = await openSoftwareUpdatePage()
    if (!result?.success) {
      XBox.popMes(result?.message || '打开 Release 页面失败')
    }
  } catch (error) {
    console.error(error)
    XBox.popMes('打开 Release 页面失败')
  }
}

onMounted(() => {
  syncUpdateState()
  if (typeof win.api?.softwareUpdateListener == 'function') {
    removeSoftwareUpdateListener = win.api.softwareUpdateListener((data: any) => {
      mergeState(normalizeSoftwareUpdateState(data))
    })
    return
  }

  if (typeof win.api?.storeChangeListener == 'function') {
    win.api.storeChangeListener((data: any) => {
      if (data?.softwareUpdate) {
        mergeState(normalizeSoftwareUpdateState(data.softwareUpdate))
      }
    })
  }
})

onUnmounted(() => {
  removeSoftwareUpdateListener?.()
  removeSoftwareUpdateListener = null
})
</script>

<template>
  <div id="software-update-entry">
    <NTooltip trigger="hover">
      <template #trigger>
        <button
          id="software-update-button"
          :class="{ active: hasUpdate || hasDownloaded }"
          @click="handleCheckUpdate(false)"
        >
          UP
        </button>
      </template>
      检查更新
    </NTooltip>

    <NModal
      v-model:show="showUpdateModal"
      preset="card"
      title="软件更新"
      :bordered="false"
      :style="{ width: '460px', maxWidth: '92vw' }"
    >
      <div id="software-update-content">
        <div class="software-update-meta">
          <div>
            <span>当前版本</span>
            <strong>{{ updateInfo?.currentVersion || '-' }}</strong>
          </div>
          <div>
            <span>最新版本</span>
            <strong>{{ updateInfo?.latestVersion || '-' }}</strong>
          </div>
          <div>
            <span>平台</span>
            <strong>{{ updateInfo?.platformKey || '-' }}</strong>
          </div>
          <div>
            <span>安装包</span>
            <strong>{{ updateInfo?.fileName || '-' }}</strong>
          </div>
        </div>

        <div class="software-update-status">
          <NTag
            size="small"
            :type="hasUpdate || hasDownloaded ? 'success' : 'default'"
            :bordered="false"
          >
            {{ updateState.message || '点击检查更新获取最新版本' }}
          </NTag>
          <span v-if="updateInfo?.fileSize">
            {{ formatSoftwarePackageSize(updateInfo.fileSize) }}
          </span>
        </div>

        <NProgress
          v-if="updateState.phase == 'downloading' || hasDownloaded"
          type="line"
          :percentage="updateState.progress"
          :height="8"
          :border-radius="8"
          :fill-border-radius="8"
        />

        <div
          v-if="progressText"
          class="software-update-progress-text"
        >
          {{ progressText }}
        </div>

        <div
          v-if="updateInfo?.releaseNotes"
          class="software-update-notes"
        >
          {{ updateInfo.releaseNotes }}
        </div>
      </div>

      <template #action>
        <NSpace justify="end">
          <NButton @click="showUpdateModal = false">关闭</NButton>
          <NButton
            v-if="updateState.phase == 'downloading'"
            @click="handleCancelDownload"
          >
            取消下载
          </NButton>
          <NButton
            v-if="updateInfo?.pageUrl"
            secondary
            @click="handleOpenPage"
          >
            Release 页面
          </NButton>
          <NButton
            :loading="updateState.phase == 'checking'"
            :disabled="updateState.busy"
            @click="handleCheckUpdate(false)"
          >
            重新检查
          </NButton>
          <NButton
            v-if="canDownload"
            type="primary"
            :loading="updateState.phase == 'downloading'"
            :disabled="updateState.busy"
            @click="handleDownloadUpdate"
          >
            下载安装包
          </NButton>
          <NButton
            v-if="hasDownloaded"
            type="primary"
            @click="handleInstallUpdate"
          >
            立即安装
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped lang="scss">
#software-update-entry {
  width: 30px;
  height: 27px;
  display: flex;
  justify-content: center;
  align-items: center;
  -webkit-app-region: no-drag;
}

#software-update-button {
  width: 26px;
  height: 22px;
  border: none;
  border-radius: 999px;
  background: rgba(117, 115, 115, 0.16);
  color: rgba(40, 44, 52, 0.52);
  font-size: 10px;
  font-weight: 800;
  line-height: 22px;
  cursor: pointer;
}

#software-update-button.active {
  background: rgba(42, 148, 125, 0.18);
  color: rgba(24, 124, 96, 0.88);
}

#software-update-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.software-update-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  > div {
    min-width: 0;
    padding: 10px;
    border-radius: var(--comp-radius-2);
    background: rgba(236, 240, 242, 0.72);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  span {
    color: var(--text-color-3);
    font-size: 12px;
    line-height: 16px;
  }

  strong {
    color: var(--text-color-1);
    font-size: 13px;
    line-height: 18px;
    word-break: break-all;
  }
}

.software-update-status {
  min-height: 26px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  color: var(--text-color-3);
  font-size: 12px;
}

.software-update-progress-text {
  margin-top: -6px;
  color: var(--text-color-3);
  font-size: 12px;
  text-align: right;
}

.software-update-notes {
  max-height: 160px;
  padding: 10px;
  border-radius: var(--comp-radius-2);
  background: rgba(236, 240, 242, 0.72);
  color: var(--text-color-1);
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow: auto;
}
</style>
