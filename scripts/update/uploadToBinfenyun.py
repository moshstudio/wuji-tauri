import logging
import json
import urllib.parse
from pathlib import Path
import boto3
from botocore.exceptions import NoCredentialsError, PartialCredentialsError

# 配置
CURR_PATH = Path(__file__).parent.absolute()
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

def get_client(config_dict, use_path_prefix=True):
    """创建 S3 客户端。use_path_prefix 为 False 时会自动剥离 endpoint 中的 bucket 后缀。"""
    endpoint = config_dict["s3endpoint"].rstrip("/")
    if not use_path_prefix and endpoint.endswith(f"/{config_dict['bucketname']}"):
        endpoint = endpoint[: -(len(config_dict["bucketname"]) + 1)]
    
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        region_name=config_dict["s3region"],
        aws_access_key_id=config_dict["s3accesskeyid"],
        aws_secret_access_key=config_dict["s3secretkeyid"],
        use_ssl=False, verify=False
    )

def _upload(client, file_path, bucket, object_name):
    """通用上传函数"""
    try:
        client.upload_file(str(file_path), bucket, object_name)
        logging.info(f"成功上传: {object_name} -> {bucket}")
        return True
    except Exception as e:
        logging.error(f"上传 {object_name} 失败: {e}")
        return False

def upload_project():
    # 1. 读取配置
    import configparser
    config = configparser.ConfigParser()
    config.read(CURR_PATH / "bitiful.ini")
    bit_cfg = dict(config["bitiful"])
    bucket = bit_cfg["bucketname"]

    # 2. 上传 JSON 更新配置 (自动套一层 /wuji/ 子目录)
    logging.info("--- 开始上传更新配置文件 ---")
    client_wuji = get_client(bit_cfg, use_path_prefix=True)
    for name in ["updater_win.json", "updater_android.json"]:
        _upload(client_wuji, CURR_PATH / name, bucket, name)

    # 3. 解析版本并上传 Windows 安装包 (直接上传到根目录)
    try:
        logging.info("--- 开始解析并上传 Windows 安装包 ---")
        with open(CURR_PATH / "updater_win.json", "r", encoding="utf-8") as f:
            win_data = json.load(f)
        
        # 提取安装包名称
        win_url = win_data["platforms"]["windows-x86_64"]["url"]
        exe_name = urllib.parse.unquote(win_url.split("/")[-1])
        exe_path = Path(r"C:\Users\14438\Desktop\wuji_things") / exe_name

        if exe_path.exists():
            client_root = get_client(bit_cfg, use_path_prefix=False)
            _upload(client_root, exe_path, bucket, exe_name)
        else:
            logging.warning(f"未找到安装包文件: {exe_path}")
    except Exception as e:
        logging.error(f"安装包上传流程异常: {e}")

if __name__ == "__main__":
    upload_project()
