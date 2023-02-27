<!--
 * @Author: Akira
 * @Date: 2023-02-23 15:08:04
 * @LastEditTime: 2023-02-27 18:28:13
-->
<script lang="ts" setup>
import { reactive, ref, watch, onMounted } from "vue"
import { createTableDataApi, deleteTableDataApi, updateTableDataApi, getTableDataApi } from "@/api/table"
import { ElMessage, ElMessageBox } from "element-plus"
import type { FormInstance, FormRules, UploadProps, UploadUserFile } from "element-plus"
import { Search, Refresh, CirclePlus, Delete, Download, RefreshRight } from "@element-plus/icons-vue"
import { usePagination } from "@/hooks/usePagination"
import { GetTreeApi, ModifyTreeApi, AddTreeApi, RemoveTreeApi } from "@/api/tree"
import { ITree, img } from "@/api/tree/types/tree"
import { IUser } from "@/api/user/types/user"
import { GetUserApi } from "@/api/user"
import { RemoveFileApi } from "@/api/upload"
import _ from "lodash"

const loading = ref<boolean>(false)
const { paginationData, handleCurrentChange, handleSizeChange } = usePagination()

//#region 增
const tree: ITree = {
  ownerID: "",
  type: "",
  height: "",
  crownDiameter: "",
  diameter: "",
  branchPoint: "",
  location: "",
  describe: "",
  imgs: [],
  price: "",
  time: undefined,
  title: "",
  status: "0",
  hci: 0
}

/** 分页用户列表 */
const userList = reactive<IUser[]>([])
const pageNo = ref<number>(1)
const limit = ref<number>(10)

const dialogVisible = ref<boolean>(false)
const formRef = ref<FormInstance | null>(null)
const formData = reactive<ITree>({ ...tree })
const formRules: FormRules = reactive({
  ownerID: [{ required: true, trigger: "blur", message: "请输入选择所有者" }],
  title: [{ required: true, trigger: "blur", message: "请输入苗木标题" }],
  type: [{ required: true, trigger: "blur", message: "请输入苗木类型" }],
  height: [{ required: true, trigger: "blur", message: "请输入苗木高度" }],
  crownDiameter: [{ required: true, trigger: "blur", message: "请输入苗木盆径木" }],
  diameter: [{ required: true, trigger: "blur", message: "请输入苗木直径" }],
  branchPoint: [{ required: true, trigger: "blur", message: "请输入苗木分支点" }],
  location: [{ required: true, trigger: "blur", message: "请输入所在地区" }],
  price: [{ required: true, trigger: "blur", message: "请输入价格" }],
  imgs: [{ required: true, trigger: "blur", message: "请至少上传一张图片" }]
})
const handleCreate = () => {
  formRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      if (currentUpdateId.value === undefined) {
        updateHci()
        await AddTreeApi(formData)
        ElMessage.success("新增成功")
        dialogVisible.value = false
        getTableData()
      } else {
        updateHci()
        await ModifyTreeApi({ _id: currentUpdateId.value, ...formData })
        ElMessage.success("修改成功")
        dialogVisible.value = false
        getTableData()
      }
    } else {
      return false
    }
  })
}
const resetForm = () => {
  currentUpdateId.value = undefined
  fileList.value = []
  Object.keys(formData).forEach((key) => (formData[key] = tree[key]))
}
const getUserData = async () => {
  const res = await GetUserApi({ pageNo: pageNo.value, limit: limit.value })
  const list = res.data.list
  if (list.length != 0) {
    userList.push(...list)
    pageNo.value++
  }
}
/**
 * 苗木高阔比计算
 */
const updateHci = () => {
  formData.hci = parseFloat((parseInt(formData.height) / parseInt(formData.crownDiameter)).toFixed(2))
}
//#endregion

//#region 删
const handleDelete = (row: any) => {
  ElMessageBox.confirm(`正在删除吗苗木：${row.type}，确认删除？`, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  }).then(async () => {
    await RemoveTreeApi({ _id: row._id })
    const filename = row.imgs.map((item: any) => {
      return item.name
    })
    await RemoveFileApi({ filename })
    ElMessage.success("删除成功")
    getTableData()
  })
}
//#endregion

//#region 改
const currentUpdateId = ref<undefined | string>(undefined)
/** 图片预览 */
const dialogImageVisible = ref<boolean>(false)
const dialogImageUrl = ref<undefined | string>(undefined)
/** 照片墙 */
const fileList = ref<UploadUserFile[]>([])

const handleUpdate = (row: any) => {
  currentUpdateId.value = row._id
  fileList.value.push(..._.cloneDeep(row.imgs))
  Object.keys(formData).forEach((key) => (formData[key] = row[key]))
  dialogVisible.value = true
}

const handleImagePreview: UploadProps["onPreview"] = (uploadFile) => {
  dialogImageUrl.value = uploadFile.url!
  dialogImageVisible.value = true
}

const handleRemove: UploadProps["onRemove"] = (uploadFile, uploadFiles) => {}

const handleBeforeRemove: UploadProps["beforeRemove"] = async (uploadFile, uploadFiles) => {
  const index = fileList.value.findIndex((item) => item.name == uploadFile.name)
  if (index == -1) return false
  const res: any = await RemoveFileApi({ filename: formData.imgs[index].name })
  if (res.code == 200) {
    formData.imgs.splice(index, 1)
    return true
  }
  return false
}

const handleSuccess: UploadProps["onSuccess"] = (response: any, uploadFile, uploadFiles) => {
  if (response.data) formData.imgs.push(response.data)
}
//#endregion

//#region 查
const tableData = ref<any[]>([])
const searchFormRef = ref<FormInstance | null>(null)
const searchData = reactive({
  type: "",
  location: ""
})
const getTableData = async () => {
  loading.value = true
  const res = await GetTreeApi({
    pageNo: paginationData.currentPage,
    limit: paginationData.pageSize,
    type: searchData.type || undefined,
    location: searchData.location || undefined
  })
  paginationData.total = res.data.count
  tableData.value = res.data.list
  loading.value = false
}
const handleSearch = () => {
  if (paginationData.currentPage === 1) {
    getTableData()
  }
  paginationData.currentPage = 1
}
const resetSearch = () => {
  searchFormRef.value?.resetFields()
  if (paginationData.currentPage === 1) {
    getTableData()
  }
  paginationData.currentPage = 1
}
const handleRefresh = () => {
  getTableData()
}
//#endregion

/** 监听分页参数的变化 */
watch([() => paginationData.currentPage, () => paginationData.pageSize], getTableData, { immediate: true })

onMounted(async () => {
  await getUserData()
})
</script>

<template>
  <div class="app-container">
    <!-- 搜索 -->
    <el-card v-loading="loading" shadow="never" class="search-wrapper">
      <el-form ref="searchFormRef" :inline="true" :model="searchData">
        <el-form-item prop="type" label="苗木类型">
          <el-input v-model="searchData.type" placeholder="请输入苗木类型" />
        </el-form-item>
        <el-form-item prop="location" label="地区">
          <el-input v-model="searchData.location" placeholder="请输入地区" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <!-- 列表 -->
    <el-card v-loading="loading" shadow="never">
      <div class="toolbar-wrapper">
        <el-button type="primary" :icon="CirclePlus" @click="dialogVisible = true">新增苗木</el-button>
        <div>
          <el-tooltip content="刷新表格">
            <el-button type="primary" :icon="RefreshRight" circle @click="handleRefresh" />
          </el-tooltip>
        </div>
      </div>
      <div class="table-wrapper">
        <el-table :data="tableData">
          <el-table-column prop="imgs" label="苗木图片" align="center">
            <template #default="scope">
              <el-image
                style="height: 65px"
                :src="scope.row.imgs[0]?.url || 'https://s2.loli.net/2023/02/25/Gdm9sxjTYKDg8t3.png'"
                fit="cover"
              />
            </template>
          </el-table-column>
          <el-table-column prop="owner" label="所有者" align="center">
            <template #default="scope">
              <span>{{ scope.row.owner.name }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="type" label="苗木类型" align="center" />
          <el-table-column prop="height" label="高度" align="center" />
          <el-table-column prop="crownDiameter" label="盆径" align="center" />
          <el-table-column prop="diameter" label="直径" align="center" />
          <el-table-column prop="branchPoint" label="分支点" align="center" />
          <el-table-column prop="location" label="地区" align="center" width="200px" />
          <el-table-column prop="price" label="价格" align="center" />
          <el-table-column prop="time" label="创建时间" align="center" width="180px" />
          <el-table-column prop="status" label="状态" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.status == '-1'" type="danger" effect="plain">待审核</el-tag>
              <el-tag v-else type="success" effect="plain">正常</el-tag>
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" width="150" align="center">
            <template #default="scope">
              <el-button
                type="primary"
                text
                bg
                size="small"
                @click="handleUpdate(scope.row)"
                :disabled="scope.row.status > 0"
                >修改</el-button
              >
              <el-button type="danger" text bg size="small" @click="handleDelete(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="pager-wrapper">
        <el-pagination
          background
          :layout="paginationData.layout"
          :page-sizes="paginationData.pageSizes"
          :total="paginationData.total"
          :page-size="paginationData.pageSize"
          :currentPage="paginationData.currentPage"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    <!-- 新增/修改 -->
    <el-dialog
      v-model="dialogVisible"
      :title="currentUpdateId === undefined ? '新增苗木' : '修改苗木'"
      @close="resetForm"
      width="30%"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px" label-position="left">
        <el-form-item prop="ownerID" label="所有者ID" v-if="currentUpdateId === undefined">
          <el-select v-model="formData.ownerID" v-loadmore="getUserData">
            <el-option
              v-for="user in userList"
              :label="user.name"
              :value="user._id as string"
              :key="user._id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item prop="title" label="苗木标题">
          <el-input v-model="formData.title" placeholder="请输入苗木标题" />
        </el-form-item>
        <el-form-item prop="type" label="苗木类型">
          <el-input v-model="formData.type" placeholder="请输入苗木类型" />
        </el-form-item>
        <el-form-item prop="height" label="高度(cm)">
          <el-input v-model="formData.height" placeholder="请输入苗木高度" />
        </el-form-item>
        <el-form-item prop="crownDiameter" label="盆径(cm)">
          <el-input v-model="formData.crownDiameter" placeholder="请输入苗木盆径" />
        </el-form-item>
        <el-form-item prop="diameter" label="直径(cm)">
          <el-input v-model="formData.diameter" placeholder="请输入苗木直径" />
        </el-form-item>
        <el-form-item prop="branchPoint" label="分支点(cm)">
          <el-input v-model="formData.branchPoint" placeholder="请输入苗木分支点" />
        </el-form-item>
        <el-form-item prop="location" label="所在地区">
          <el-input v-model="formData.location" placeholder="请输入所在地区 如：安徽省安庆市怀宁县金拱镇" />
        </el-form-item>
        <el-form-item prop="price" label="价格">
          <el-input v-model="formData.price" placeholder="请输入价格" />
        </el-form-item>
        <el-form-item prop="imgs" label="图片">
          <el-upload
            v-model:file-list="fileList"
            action="/api/uploadCenter/upload"
            list-type="picture-card"
            :on-preview="handleImagePreview"
            :on-remove="handleRemove"
            :before-remove="handleBeforeRemove"
            :on-success="handleSuccess"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>

          <el-dialog v-model="dialogImageVisible">
            <img w-full :src="dialogImageUrl" alt="Preview Image" />
          </el-dialog>
        </el-form-item>
        <el-form-item prop="status" label="状态">
          <el-switch
            v-model="formData.status"
            active-color="#13ce66"
            inactive-color="#ff4949"
            active-value="0"
            inactive-value="-1"
          >
          </el-switch>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.search-wrapper {
  margin-bottom: 20px;
  :deep(.el-card__body) {
    padding-bottom: 2px;
  }
}

.toolbar-wrapper {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.table-wrapper {
  margin-bottom: 20px;
}

.pager-wrapper {
  display: flex;
  justify-content: flex-end;
}
</style>