# BSCS ARCHIVE

local web system designed to archive and manage class photos. basically a time capsule but on a website 

## features

* responsive photo gallery with a detailed modal view.
* admin dashboard to approve, edit, or delete entries.
* local storage system to keep images and data private.

## tech stack in this project we've used

* frontend: vanilla html, css, javascript
* backend: node.js, express
* database: sqlite3

<!-- ## UI previews -->
<!---->
<!-- |          gallery view           |         detail view          |       admin dashboard       | -->
<!-- | :-----------------------------: | :--------------------------: | :-------------------------: | -->
<!-- | ![gallery](path/to/gallery.jpg) | ![detail](path/to/modal.jpg) | ![admin](path/to/admin.jpg) | -->

---

## local setup

> [!IMPORTANT]
> this project doesn't implement any remote server or database and only relies locally since the database used for this project is sqlite3 meaning if you want to test this you need to build this from your device


## for linux/macOS/windows

- clone the repository
```
git clone https://github.com/frtzhahn/BSCS-archive-project.git)
cd BSCS-archive-project
````

- **install dependencies**

```
npm install
```

- **configure the environment**
	copy `.env.example` and rename it to `.env`. you can update the default admin credentials inside this file.
- **start the server**

```
node server.js
```

>[!NOTE]
>open your browser and go to `http://localhost:3000`. a fresh local database will be created automatically on your first boot. 

---

## for termux users (mobile)

- **update packages**
```
pkg update && pkg upgrade
```
  
- **install nodejs and git**

```
pkg install nodejs git
```

    
- **clone and enter**

```
git clone https://github.com/frtzhahn/BSCS-archive-project.git
cd BSCS-archive-project
```
  
- **install dependencies**

```
npm install
```

- **setup environment**

```
cp .env.example .env
```
  
- **launch:**

```
node server.js
```
  
>[!NOTE]
>to view the website open chrome or any mobile browser and go to `http://localhost:3000`
