import abc
import logging


class Loggable(metaclass=abc.ABCMeta):
    @property
    def log(self):
        """
        Return a logger named after the implementing class's qualified name.
        """
        class_logger_name = f"{self.__class__.__module__}.{self.__class__.__qualname__}"
        # class_logger_name = f"{self.__module__}.{self.__class__.__name__}"
        # print(f"class_logger_name: {class_logger_name}")
        return logging.getLogger(class_logger_name)
