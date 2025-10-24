# import
import logging
from pathlib import Path
import boto3
from botocore.exceptions import NoCredentialsError, PartialCredentialsError
from botocore.client import Config
from dataclasses import dataclass

CURR_PATH = Path(__file__).parent.absolute()
# 配置日志输出到控制台
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


@dataclass
class BitifulConfig:
    s3endpoint: str
    s3region: str
    s3accessKeyId: str
    s3SecretKeyId: str
    bucketName: str


def read_bitiful_config() -> BitifulConfig:
    import configparser

    config = configparser.ConfigParser()

    # 读取 .ini 文件
    config.read(CURR_PATH.joinpath("bitiful.ini"))
    # 获取配置信息
    s3endpoint = config["bitiful"]["s3endpoint"]
    s3region = config["bitiful"]["s3region"]  # 获取整数类型的值
    s3accessKeyId = config["bitiful"]["s3accessKeyId"]
    s3SecretKeyId = config["bitiful"]["s3SecretKeyId"]
    bucketName = config["bitiful"]["bucketName"]
    logging.info(
        f""""配置文件信息
s3endpoint: {s3endpoint}
s3region: {s3region}
s3accessKeyId: {s3accessKeyId}
s3SecretKeyId: {s3SecretKeyId}
bucketName: {bucketName}
"""
    )
    return BitifulConfig(s3endpoint, s3region, s3accessKeyId, s3SecretKeyId, bucketName)


def upload_project(config: BitifulConfig):
    client = boto3.client(
        "s3",
        use_ssl=False,
        verify=False,
        endpoint_url=config.s3endpoint,
        region_name=config.s3region,
        aws_access_key_id=config.s3accessKeyId,
        aws_secret_access_key=config.s3SecretKeyId,
    )

    updater_file = CURR_PATH.joinpath("updater_win.json")
    _upload_file(client, updater_file, config.bucketName, "updater_win.json")
    updater_android_file = CURR_PATH.joinpath("updater_android.json")
    _upload_file(
        client, updater_android_file, config.bucketName, "updater_android.json"
    )


def _upload_file(client, file_name, bucket, object_name=None) -> bool:
    """
    上传文件到 S3 Bucket 的根目录，并覆盖已存在的文件。

    :param bucket_name: S3 Bucket 名称
    :param file_name: 本地文件路径
    :param object_name: S3 中的对象名称（可选，默认为文件名称）
    """
    # 如果未指定 object_name，则使用 file_name 作为 S3 中的对象名称
    if object_name is None:
        object_name = file_name

    # 创建 S3 客户端
    s3_client = client

    try:
        # 上传文件
        s3_client.upload_file(file_name, bucket, object_name)
        logging.info(f"文件 {file_name} 已成功上传到 {bucket}/{object_name}")
        return True
    except FileNotFoundError:
        logging.error(f"文件 {file_name} 未找到")
    except NoCredentialsError:
        logging.error("未找到 AWS 凭证")
    except PartialCredentialsError:
        logging.error("AWS 凭证不完整")
    except Exception as e:
        logging.error(f"上传文件时发生错误: {e}")
    return False


if __name__ == "__main__":
    config = read_bitiful_config()
    upload_project(config)
