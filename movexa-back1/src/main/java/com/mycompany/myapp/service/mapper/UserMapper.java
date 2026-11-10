package com.mycompany.myapp.service.mapper;

import com.mycompany.myapp.domain.User;
import com.mycompany.myapp.service.dto.UserDTO;
import org.mapstruct.Mapper;

/** Un mapper MapStruct doit être une interface (ou une classe abstraite), pas une classe concrète. */
@Mapper(componentModel = "spring")
public interface UserMapper {
    UserDTO toDto(User user);
}
