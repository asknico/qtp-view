# Vben5 代码生成模板（antdv-next 专用）

为后端代码生成器（`qtp-modules/qtp-generator`）提供的 vben5 / antdv-next 前端模板。

> 注意：antdv-next 专用模板与 ant-design-vue 版本**不兼容**，不要混用。

## 目录内容

| 文件/目录 | 说明 |
| :--- | :--- |
| `vben5/` | Velocity 模板（.vm），生成 vben5 风格的前端页面代码 |
| `VelocityUtils.java` | 后端生成器工具类，新增了 vben5 模板支持 |
| `更新指南.md` | 模板更新指引 |

## 安装步骤（后端 qtp 仓库）

### 1. 粘贴模板文件

将 `vben5` 文件夹复制到后端 `qtp-modules/qtp-generator` 的 `src/main/resources/vm`（Velocity 模板目录）下。

### 2. 替换 Java 工具类

将 `VelocityUtils.java` 替换到：

```
qtp-modules/qtp-generator/src/main/java/com/minscope/generator/util/VelocityUtils.java
```

**此文件只是新增了 vben5 代码支持，不影响原版生成。**

### 3. 重启后端

重启 qtp 后端服务使模板生效。

### 4. 预览 / 下载

进入前端【系统工具 → 代码生成】，选择表后预览/下载，生成的 `vben5` 文件夹即为前端页面代码，按目录结构放入 `apps/web-antd/src/views` 与 `src/api` 后配置菜单即可。
